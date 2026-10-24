/* ===== 小铺商城 · 买家端（账号 / 购物车 / 详情规格 / 订单 / 拼团）=====
   shop/index.html 专用，不依赖 site-common；所有数据经 Supabase RLS 保护。
   金额/价格一律以数据库为准（下单走 shop_place_order RPC 服务端计算）。 */
(function () {
  'use strict';
  var SUPABASE_URL = 'https://zajcglvlzsolygvjeumb.supabase.co';
  var ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InphamNnbHZsenNvbHlndmpldW1iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEyMzI4NjUsImV4cCI6MjEwNjgwODg2NX0.7_Pthb3wPInb5v4o7IoWejozEvDZQgNPS8DgwikQ8ys';

  // ===== 小工具 =====
  function esc(s) { var d = document.createElement('div'); d.textContent = s == null ? '' : String(s); return d.innerHTML; }
  function arr(x) { return Array.isArray(x) ? x : []; } // REST 报错/表未建时优雅兜底
  function money(v) { var n = parseFloat(v); return isNaN(n) ? '0.00' : n.toFixed(2); }
  function normImg(u) { u = String(u || ''); return /^(https?:\/\/|data:)/.test(u) ? u : '/' + u.replace(/^\/+/, ''); }
  function t(zh, en) { return (window.LANG === 'en') ? en : zh; }

  // ===== 买家登录态 =====
  var USER = null; // {a: access, r: refresh, email}
  var YK_EXCLUSIVE_EMAIL = 'chengyuki119@gmail.com';
  function loadUser() {
    // 统一会话源：读双键中最近登录的那把（管理员/买家同一套判断，全站一致）
    if (window.ykSession) { USER = ykSession(); return; }
    try { USER = JSON.parse(localStorage.getItem('yuki-user-session') || 'null'); } catch (e) { USER = null; }
  }
  function saveUser() {
    // 统一写入点：专属邮箱写后台键，其他写买家键，并清掉另一把（不再双拷贝）
    if (window.ykWriteSession) {
      if (USER) { USER.t = Date.now(); ykWriteSession(USER, USER.email && USER.email.toLowerCase() === YK_EXCLUSIVE_EMAIL ? 'yuki-admin-session' : 'yuki-user-session'); }
      else ykWriteSession(null);
      return;
    }
    try {
      if (USER) { USER.t = Date.now(); localStorage.setItem('yuki-user-session', JSON.stringify(USER)); }
      else localStorage.removeItem('yuki-user-session');
    } catch (e) {}
  }
  function refreshUser() {
    if (!USER || !USER.r) return Promise.resolve(false);
    // 统一续期：单飞 + 并发竞态重试；只有会话真失效才清空
    if (window.ykRefreshSession) {
      return window.ykRefreshSession().then(function (s) {
        if (s) { USER = s; return true; }
        // 瞬时失败（网络抖动）≠ 会话失效：存储里会话还在就保持登录态，不降级成普通用户
        var keep = window.ykSession ? ykSession() : null;
        USER = keep || null;
        return !!keep;
      });
    }
    return fetch(SUPABASE_URL + '/auth/v1/token?grant_type=refresh_token', {
      method: 'POST', headers: { 'apikey': ANON, 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: USER.r })
    }).then(function (r) { return r.ok ? r.json() : null; }).then(function (d) {
      if (d && d.access_token) { USER = { a: d.access_token, r: d.refresh_token, email: d.user && d.user.email }; saveUser(); return true; }
      USER = null; saveUser(); return false;
    }).catch(function () { return false; });
  }
  function api(path, opts) {
    opts = opts || {};
    var headers = { 'apikey': ANON, 'Content-Type': 'application/json' };
    if (USER && USER.a) headers['Authorization'] = 'Bearer ' + USER.a;
    opts.headers = Object.assign(headers, opts.headers || {});
    return fetch(SUPABASE_URL + '/rest/v1/' + path, opts).then(function (r) {
      if (r.status === 401 && USER) {
        return refreshUser().then(function (ok) {
          if (!ok) return r;
          opts.headers['Authorization'] = 'Bearer ' + USER.a;
          return fetch(SUPABASE_URL + '/rest/v1/' + path, opts);
        });
      }
      return r;
    });
  }
  function rpc(fn, args) {
    return refreshUser().then(function () {
      var headers = { 'apikey': ANON, 'Content-Type': 'application/json' };
      if (USER && USER.a) headers['Authorization'] = 'Bearer ' + USER.a;
      return fetch(SUPABASE_URL + '/rest/v1/rpc/' + fn, { method: 'POST', headers: headers, body: JSON.stringify(args) })
        .then(function (r) { return r.json().then(function (d) { return { ok: r.ok, data: d }; }); });
    });
  }

  // ===== 购物车（本地 + 登录后云同步合并）=====
  var CART = [];
  function loadCart() { try { CART = JSON.parse(localStorage.getItem('yuki-cart') || '[]'); } catch (e) { CART = []; } if (!Array.isArray(CART)) CART = []; }
  function saveCart() {
    try { localStorage.setItem('yuki-cart', JSON.stringify(CART)); } catch (e) {}
    paintCartBadge();
    if (USER) {
      // 云端同步：登录后购物车跨设备跟随（user_id 由服务端拿）
      getUid().then(function (uid) {
        if (!uid) return;
        api('shop_carts?on_conflict=user_id', { method: 'POST', headers: { 'Prefer': 'resolution=merge-duplicates' }, body: JSON.stringify({ user_id: uid, items: CART }) }).catch(function () {});
      });
    }
  }
  var UID = null;
  function getUid() {
    if (UID) return Promise.resolve(UID);
    if (!USER || !USER.a) return Promise.resolve(null);
    return fetch(SUPABASE_URL + '/auth/v1/user', { headers: { 'apikey': ANON, 'Authorization': 'Bearer ' + USER.a } })
      .then(function (r) { return r.ok ? r.json() : null; }).then(function (u) { UID = u ? u.id : null; return UID; }).catch(function () { return null; });
  }
  function cartKey(id, sku) { return String(id) + '::' + String(sku || ''); }
  function cartAdd(item, qty) {
    var k = cartKey(item.id, item.sku);
    var hit = CART.filter(function (x) { return cartKey(x.id, x.sku) === k; })[0];
    if (hit) hit.qty += qty || 1;
    else CART.push({ id: item.id, sku: item.sku || '', name: item.name, image: item.image || '', price: item.price, qty: qty || 1, checked: true });
    saveCart();
  }
  function paintCartBadge() {
    var n = 0; CART.forEach(function (x) { n += x.qty; });
    try { if (window.SiteMenu) SiteMenu.setCartCount(n); } catch (e) {}
  }

  window.__rgNotifyWanted = false; // 注册时勾选的上新订阅，建号成功后写入资料

  // ===== 输入框 / 选项卡统一样式（边界清晰、状态明确）=====
  function styleInputs(root) {
    (root || document).querySelectorAll('input, textarea').forEach(function (i) {
      if (i.dataset.styled) return;
      i.dataset.styled = '1';
      i.style.cssText = 'width:100%;padding:11px 14px;font-size:17px;border:1.5px solid var(--accent-soft,#ffc8d6);border-radius:12px;background:#fff;outline:none;color:var(--text,#5d6780);font-family:inherit;box-sizing:border-box;transition:border-color .15s;box-shadow:0 2px 10px rgba(255,143,171,.06);';
      i.addEventListener('focus', function () { i.style.borderColor = '#f79fbd'; });
      i.addEventListener('blur', function () { i.style.borderColor = 'var(--accent-soft,#ffc8d6)'; });
    });
  }
  function paintTabs(scope, active) {
    scope.querySelectorAll('.acct-tab').forEach(function (x) {
      var on = x === active;
      // 柔和粉色系：选中浅粉底深玫瑰字，未选中白底软粉描边，不过分强烈
      x.style.background = on ? '#ffd9e6' : '#fff';
      x.style.color = on ? '#a04a68' : 'var(--muted,#9aa5bd)';
      x.style.boxShadow = on ? 'none' : 'inset 0 0 0 1.5px var(--accent-soft,#ffc8d6)';
    });
  }
  function styleTabs(scope) { paintTabs(scope, scope.querySelector('.acct-tab.on')); }

  // ===== 新品上架通知订阅（默认关闭；站内自定义开关，不用原生 checkbox）=====
  function subRead() {
    try { return localStorage.getItem('yuki-notify-new') === '1'; } catch (e) { return false; }
  }
  function subWrite(on, uid) {
    try { localStorage.setItem('yuki-notify-new', on ? '1' : '0'); } catch (e) {}
    if (!uid) return Promise.resolve(false);
    return api('shop_profiles?on_conflict=id', { method: 'POST', headers: { 'Prefer': 'resolution=merge-duplicates' }, body: JSON.stringify({ id: uid, notify_new: on }) }).then(function (r) {
      return !!r.ok;
    }).catch(function () { return false; });
  }
  function subToggleHtml(id, on) {
    return '<button type="button" id="' + id + '" role="switch" aria-checked="' + (on ? 'true' : 'false') + '" style="width:46px;height:26px;border-radius:999px;border:none;cursor:pointer;padding:0;position:relative;transition:background .2s;font-family:inherit;background:' + (on ? 'var(--accent,#ff6fa5)' : '#e8d5de') + ';flex-shrink:0;">' +
      '<span style="position:absolute;top:3px;left:' + (on ? '23px' : '3px') + ';width:20px;height:20px;border-radius:50%;background:#fff;transition:left .2s;box-shadow:0 1px 4px rgba(120,70,95,.25);"></span></button>';
  }
  function bindSubToggle(btn, getUidFn, onChange) {
    if (!btn) return;
    btn.addEventListener('click', function () {
      var on = btn.getAttribute('aria-checked') !== 'true';
      btn.setAttribute('aria-checked', on ? 'true' : 'false');
      btn.style.background = on ? 'var(--accent,#ff6fa5)' : '#e8d5de';
      btn.querySelector('span').style.left = on ? '23px' : '3px';
      var done = subWrite(on, getUidFn ? getUidFn() : null);
      if (onChange) onChange(on);
      if (done && done.then) done.then(function (ok) { if (!ok && on) toast(t('订阅已在本机保存（账号资料同步失败）', 'Saved on this device (account sync failed)')); });
    });
  }

  // ===== 视图路由 =====
  var LIST_SELS = ['.notice', '#product-grid', '#past', '#reviews', '#pay'];
  function showView(name) {
    LIST_SELS.forEach(function (s) { var el = document.querySelector(s); if (el) el.style.display = (name === 'list') ? '' : 'none'; });
    ['detail', 'cart', 'checkout', 'orders', 'account', 'groups'].forEach(function (v) {
      var el = document.getElementById('view-' + v);
      if (el) el.style.display = (v === name) ? 'block' : 'none';
    });
    window.scrollTo(0, 0);
  }

  // ===== 商品详情（淘宝式规格联动）=====
  var DETAIL = null; // {p, sku, qty}
  function variantsOf(p) {
    return (Array.isArray(p.variants) && p.variants.length) ? p.variants : null;
  }
  function currentVariant(p, sku) {
    var vs = variantsOf(p);
    if (!vs) return null;
    return vs.filter(function (v) { return v.sku === sku; })[0] || null;
  }
  function variantStock(v) { return v ? (parseInt(v.stock, 10) || 0) : 0; }
  function openDetail(id, sku, retry) {
    if (!PRODUCTS.length && !(retry > 20)) { setTimeout(function () { openDetail(id, sku, (retry || 0) + 1); }, 250); return; } // 等商品异步加载完
    var p = PRODUCTS.filter(function (x) { return String(x.id) === String(id); })[0];
    var box = document.getElementById('view-detail');
    if (!p) { box.innerHTML = '<p style="text-align:center;color:var(--muted);padding:40px 0;">' + t('商品不存在或已下架', 'Item not found') + '</p>'; showView('detail'); return; }
    var vs = variantsOf(p);
    // 默认规格：URL 指定的 > 第一个有货的 > 第一个
    if (vs) {
      var hit = sku ? currentVariant(p, sku) : null;
      if (!hit) hit = vs.filter(function (v) { return variantStock(v) > 0; })[0] || vs[0];
      sku = hit.sku;
    }
    DETAIL = { p: p, sku: sku || '', qty: 1 };
    box.innerHTML = '';
    box.appendChild(detailEl());
    showView('detail');
    paintDetail();
  }
  function detailEl() {
    var d = DETAIL, p = d.p, vs = variantsOf(p), v = vs ? currentVariant(p, d.sku) : null;
    var st = v ? (variantStock(v) > 0 ? 'on' : 'out') : (p.sold || !(p.stock > 0) ? 'out' : 'on');
    var imgs = v && Array.isArray(v.images) && v.images.length ? v.images : (Array.isArray(p.images) && p.images.length ? p.images : (p.image_url ? [p.image_url] : []));
    var price = v ? (v.price != null ? v.price : p.price) : p.price;
    var skuText = v ? (v.sku || '') : '';
    var el = document.createElement('div');
    el.innerHTML =
      '<a class="back-link" href="/shop/" style="margin-bottom:14px;display:inline-flex;">← ' + t('回小铺', 'Back to shop') + '</a>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:22px;align-items:start;">' +
        '<div id="d-pager">' + pagerWrapHtml(imgs.map(normImg), p.name) + '</div>' +
        '<div>' +
          '<span class="product-tag">' + esc(p.tag || t('没有标签', 'Untagged')) + '</span>' +
          '<h2 style="font-size:24px;margin:6px 0 4px;display:inline-block;">' + esc(p.name) + '</h2>' +
          '<button type="button" class="fav-btn detail-fav' + (isFav(p.id) ? ' on' : '') + '" data-fav="' + escAttr(p.id) + '" aria-label="' + t('收藏', 'Favorite') + '">' + (isFav(p.id) ? '♥' : '♡') + '</button>' +
          '<p style="color:var(--muted);font-size:17px;">' + esc(p.description || '') + '</p>' +
          '<div style="font-size:26px;color:var(--accent);font-weight:700;margin:10px 0;">¥' + money(price) + '</div>' +
          (skuText ? '<div style="font-size:15px;color:var(--muted);margin-bottom:6px;">SKU: ' + esc(skuText) + '</div>' : '') +
          (vs ?
            '<div style="margin:10px 0;"><div style="font-size:16px;margin-bottom:6px;">' + t('规格', 'Option') + '</div><div id="d-variants" style="display:flex;gap:8px;flex-wrap:wrap;">' +
            vs.map(function (x) {
              var out = variantStock(x) <= 0;
              return '<button type="button" class="sku-chip' + (x.sku === d.sku ? ' on' : '') + (out ? ' dis' : '') + '" data-sku="' + escAttr(x.sku) + '">' + esc(x.name || x.sku) + (out ? ' · ' + t('缺货', 'Out') : '') + '</button>';
            }).join('') + '</div></div>' : '') +
          (st === 'on' ?
            '<div style="display:flex;align-items:center;gap:12px;margin:12px 0;">' +
              '<span style="font-size:16px;">' + t('数量', 'Qty') + '</span>' +
              '<button type="button" class="qty-btn" data-d="-1">−</button><b id="d-qty">1</b><button type="button" class="qty-btn" data-d="1">＋</button>' +
              '<span style="font-size:15px;color:var(--muted);">' + t('库存', 'Stock') + ' ' + (v ? variantStock(v) : (p.stock || 0)) + '</span>' +
            '</div>' +
            '<div style="display:flex;gap:10px;flex-wrap:wrap;margin:12px 0;">' +
              '<button class="buy-btn" id="d-add" style="padding:10px 22px;">' + t('加入购物车', 'Add to cart') + '</button>' +
              '<button class="buy-btn" id="d-buy" style="padding:10px 22px;background:var(--accent);color:#fff;">' + t('立即购买', 'Buy now') + '</button>' +
            '</div>' +
            '<button class="buy-btn" id="d-group" style="padding:9px 20px;background:#fff;border:2px solid var(--accent);color:var(--accent);">' + t('发起拼团', 'Start a group buy') + '</button>'
          : '<p class="no-buy" style="margin:14px 0;">' + (st === 'out' ? t('已售罄，看看别的吧～', 'Sold out — take a look at other items~') : t('仅展示，不能下单', 'Not for sale')) + '</p>') +
        '</div>' +
      '</div>' +
      '<div id="d-group-form" style="display:none;margin-top:16px;" class="card"></div>';
    return el;
  }
  function escAttr(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;'); }
  function paintDetail() {
    // 规格 → 图片/价格/库存/SKU 同步刷新
    var d = DETAIL; if (!d) return;
    var fresh = detailEl();
    var box = document.getElementById('view-detail');
    box.innerHTML = '';
    box.appendChild(fresh);
    bindDetail();
  }
  function bindDetail() {
    var d = DETAIL, p = d.p;
    document.querySelectorAll('#d-variants .sku-chip').forEach(function (chip) {
      chip.addEventListener('click', function () {
        if (chip.classList.contains('dis')) { toast(t('这个规格缺货啦，选一个有货的吧', 'This option is out of stock')); return; }
        d.sku = chip.getAttribute('data-sku');
        paintDetail(); // 重建 → 图/价/库存/SKU 同步
        try { history.replaceState(null, '', '?id=' + encodeURIComponent(p.id) + '&sku=' + encodeURIComponent(d.sku)); } catch (e) {}
      });
    });
    document.querySelectorAll('.qty-btn').forEach(function (b) {
      b.addEventListener('click', function () {
        var vs = variantsOf(p); var v = vs ? currentVariant(p, d.sku) : null;
        var max = v ? variantStock(v) : (p.stock || 99);
        d.qty = Math.min(max, Math.max(1, d.qty + parseInt(b.getAttribute('data-d'), 10)));
        var el = document.getElementById('d-qty'); if (el) el.textContent = d.qty;
      });
    });
    var add = document.getElementById('d-add');
    if (add) add.addEventListener('click', function () { addCartFromDetail(false); });
    var buy = document.getElementById('d-buy');
    if (buy) buy.addEventListener('click', function () { addCartFromDetail(true); });
    var gb = document.getElementById('d-group');
    if (gb) gb.addEventListener('click', openGroupForm);
  }
  function addCartFromDetail(goCheckout) {
    var d = DETAIL, p = d.p, vs = variantsOf(p), v = vs ? currentVariant(p, d.sku) : null;
    var price = v ? (v.price != null ? v.price : p.price) : p.price;
    var img = v && Array.isArray(v.images) && v.images.length ? v.images[0] : (Array.isArray(p.images) && p.images.length ? p.images[0] : p.image_url);
    cartAdd({ id: p.id, sku: d.sku, name: p.name + (v ? ' · ' + (v.name || d.sku) : ''), image: img, price: price }, d.qty);
    toast(t('已加入购物车', 'Added to cart'));
    if (goCheckout) { renderCart(); showView('cart'); }
  }

  // ===== 发起拼团 =====
  function openGroupForm() {
    var d = DETAIL, p = d.p, v = variantsOf(p) ? currentVariant(p, d.sku) : null;
    var price = v ? (v.price != null ? v.price : p.price) : p.price;
    var box = document.getElementById('d-group-form');
    box.style.display = '';
    box.innerHTML =
      '<h3 style="font-size:19px;margin-bottom:10px;">' + t('发起拼团', 'Start a group buy') + '</h3>' +
      '<p style="font-size:15px;color:var(--muted);margin-bottom:10px;">' + t('拼团价 ¥' + money(price) + ' · 你是团长，把链接分享给小伙伴，人满即成团', 'Group price ¥' + money(price) + ' · You are the leader. Share the link — group closes when full.') + '</p>' +
      '<div style="display:flex;gap:12px;flex-wrap:wrap;align-items:center;">' +
        '<label style="font-size:16px;">' + t('目标人数', 'Target') + ' <input id="g-target" type="number" min="2" max="50" value="2" style="width:70px;padding:8px;border:none;border-radius:10px;background:#fff;font-family:inherit;font-size:17px;"></label>' +
        '<label style="font-size:16px;">' + t('有效小时数', 'Hours open') + ' <input id="g-hours" type="number" min="1" max="720" value="48" style="width:70px;padding:8px;border:none;border-radius:10px;background:#fff;font-family:inherit;font-size:17px;"></label>' +
        '<button class="buy-btn" id="g-go" style="padding:9px 20px;">' + t('创建拼团', 'Create group') + '</button>' +
      '</div>';
    document.getElementById('g-go').addEventListener('click', function () {
      var target = parseInt(document.getElementById('g-target').value, 10) || 2;
      var hours = parseInt(document.getElementById('g-hours').value, 10) || 48;
      if (!USER) { toast(t('发起拼团要先登录哦', 'Please log in first')); renderAccount(); return; }
      var body = {
        product_id: p.id, variant_sku: d.sku || '', name: p.name + (v ? ' · ' + (v.name || '') : ''),
        product_name: p.name, product_image: (v && Array.isArray(v.images) && v.images.length ? v.images[0] : (Array.isArray(p.images) && p.images.length ? p.images[0] : p.image_url)) || '',
        price: price, target: target, joined: 0, status: 'open',
        deadline: new Date(Date.now() + hours * 3600e3).toISOString(), leader_id: null
      };
      getUid().then(function (uid) {
        body.leader_id = uid;
        return api('shop_groups', { method: 'POST', body: JSON.stringify(body) });
      }).then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
      .then(function (res) {
        if (!res.ok || !res.j || !res.j.id) { toast((res.j && res.j.message) || t('创建失败，请先登录', 'Create failed')); return; }
        toast(t('拼团创建成功！现在去下单占座', 'Group created! Now place your order'));
        GROUP_CURRENT = res.j.id;
        openGroupDetail(res.j.id, { autoJoin: true });
      });
    });
  }

  // ===== 拼团 =====
  var GROUP_CURRENT = null, GROUP_TIMER = null;
  function openGroups() {
    showView('groups');
    fetch(SUPABASE_URL + '/rest/v1/shop_groups?select=*&order=created_at.desc&limit=50', { headers: { 'apikey': ANON } })
      .then(function (r) { return r.json(); }).then(function (rows) {
        rows = arr(rows).map(function (g) { if (g.status === 'open' && new Date(g.deadline) < new Date()) g.status = 'failed'; return g; });
        var box = document.getElementById('view-groups');
        var stMap = { open: [t('进行中', 'Open'), '#9ecfae'], success: [t('已成团', 'Success'), '#ff6fa5'], failed: [t('已失败', 'Failed'), '#c4bcb6'], cancelled: [t('已取消', 'Cancelled'), '#c4bcb6'] };
        box.innerHTML = '<h2 style="font-size:22px;margin-bottom:14px;">' + t('拼团', 'Group Buys') + '</h2>' +
          (!rows.length ? '<p style="color:var(--muted);text-align:center;padding:30px 0;">' + t('还没有进行中的拼团，来发一个～', 'No group buys yet — start one!') + '</p>' :
          '<div class="grid">' + rows.map(function (g) {
            var st = stMap[g.status] || stMap.open;
            var full = g.joined >= g.target;
            return '<div class="product" data-gid="' + escAttr(g.id) + '" style="cursor:pointer;">' +
              '<div class="product-img">' + (g.product_image ? '<img src="' + escAttr(normImg(g.product_image)) + '" style="width:100%;height:100%;object-fit:cover;">' : '') +
                '<span class="st" style="background:' + st[1] + ';">' + st[0] + '</span></div>' +
              '<div class="product-info"><span class="product-tag">' + t('拼团价', 'Group price') + '</span>' +
                '<h3>' + esc(g.name || g.product_name) + '</h3>' +
                '<div style="font-size:22px;color:var(--accent);font-weight:700;">¥' + money(g.price) + '</div>' +
                '<div style="font-size:15px;color:var(--muted);margin-top:4px;">' + g.joined + '/' + g.target + ' ' + t('人', 'joined') +
                (g.status === 'open' ? ' · ' + t('截止', 'Ends') + ' ' + new Date(g.deadline).toLocaleString() : '') + '</div>' +
                (g.status === 'open' && !full ? '<div class="product-row"><button class="buy-btn">' + t('去参团', 'Join') + '</button></div>' : '') +
              '</div></div>';
          }).join('') + '</div>');
        box.querySelectorAll('[data-gid]').forEach(function (card) {
          card.addEventListener('click', function () { openGroupDetail(card.getAttribute('data-gid')); });
        });
      });
  }
  function openGroupDetail(gid, opts) {
    opts = opts || {};
    if (GROUP_TIMER) { clearInterval(GROUP_TIMER); GROUP_TIMER = null; }
    fetch(SUPABASE_URL + '/rest/v1/shop_groups?select=*&id=eq.' + gid, { headers: { 'apikey': ANON } })
      .then(function (r) { return r.json(); }).then(function (rows) {
        var g = rows && rows[0];
        var box = document.getElementById('view-groups');
        if (!g) { box.innerHTML = '<p style="color:var(--muted);text-align:center;padding:30px 0;">' + t('拼团不存在', 'Group not found') + '</p>'; return; }
        if (g.status === 'open' && new Date(g.deadline) < new Date()) g.status = 'failed';
        var memberQ = USER ? api('shop_group_members?select=nickname,user_id,created_at&group_id=eq.' + gid) : Promise.resolve({ json: function () { return []; } });
        memberQ.then(function (r) { return r.json(); }).then(function (members) {
          members = arr(members);
          var stText = { open: t('进行中', 'Open'), success: t('已成团 🎉'.replace(' 🎉', ''), 'Success'), failed: t('已失败', 'Failed'), cancelled: t('已取消', 'Cancelled') }[g.status];
          box.innerHTML =
            '<a class="back-link" href="/shop/?sec=groups" style="margin-bottom:14px;display:inline-flex;">← ' + t('全部拼团', 'All groups') + '</a>' +
            '<div class="card" style="padding:18px;">' +
              '<div style="display:grid;grid-template-columns:180px 1fr;gap:18px;">' +
                (g.product_image ? '<img src="' + escAttr(normImg(g.product_image)) + '" style="width:180px;height:180px;object-fit:cover;border-radius:14px;">' : '') +
                '<div><h2 style="font-size:22px;">' + esc(g.name || g.product_name) + '</h2>' +
                  '<div style="font-size:26px;color:var(--accent);font-weight:700;margin:6px 0;">¥' + money(g.price) + '</div>' +
                  '<div style="font-size:16px;">' + t('已参团', 'Joined') + ' <b>' + g.joined + '</b> / ' + g.target + ' ' + t('人', 'people') + '</div>' +
                  '<div style="font-size:16px;color:var(--muted);margin-top:4px;">' + (g.status === 'open' ? t('截止', 'Ends') + ' <b id="g-countdown"></b>' : stText) + '</div>' +
                '</div>' +
              '</div>' +
              (g.status === 'open' ?
                '<div style="margin-top:16px;display:flex;gap:10px;flex-wrap:wrap;">' +
                  (g.joined < g.target ? '<button class="buy-btn" id="g-join" style="padding:10px 24px;background:var(--accent);color:#fff;">' + t('加入拼团', 'Join group') + '</button>' : '<span class="no-buy">' + t('人数已满，等待成员付款中', 'Full — waiting for payments') + '</span>') +
                '</div>' : '') +
              '<div style="margin-top:14px;font-size:15px;color:var(--muted);">' + t('成员', 'Members') + '：' +
                (members.length ? members.map(function (m) { return esc(m.nickname || t('小伙伴', 'member')); }).join('、') : t('虚位以待…', 'Waiting…')) +
              '</div>' +
              '<p style="font-size:14px;color:var(--muted);margin-top:10px;">' + t('满员后所有成员付款验证通过才算成团；超时未满员自动失败，订单可取消。', 'A group closes only when full AND every member\'s payment is confirmed. If time runs out, it fails and orders can be cancelled.') + '</p>' +
            '</div>';
          var join = document.getElementById('g-join');
          if (join) join.addEventListener('click', function () { joinGroup(g); });
          if (g.status === 'open') {
            GROUP_TIMER = setInterval(function () {
              var cd = document.getElementById('g-countdown');
              if (!cd) { clearInterval(GROUP_TIMER); return; }
              var ms = new Date(g.deadline) - new Date();
              if (ms <= 0) { cd.textContent = t('已截止', 'Ended'); clearInterval(GROUP_TIMER); return; }
              var h = Math.floor(ms / 3600e3), m2 = Math.floor(ms % 3600e3 / 60e3), s2 = Math.floor(ms % 60e3 / 1e3);
              cd.textContent = h + ':' + String(m2).padStart(2, '0') + ':' + String(s2).padStart(2, '0');
            }, 1000);
          }
        });
        if (opts.autoJoin) setTimeout(function () { var j = document.getElementById('g-join'); if (j) j.click(); }, 300);
      });
  }
  function joinGroup(g) {
    if (!USER) { toast(t('参团要先登录哦', 'Please log in first')); renderAccount(); return; }
    // 有规格的商品 → 去详情页选规格后下单；无规格 → 直接 RPC 下单
    var p = PRODUCTS.filter(function (x) { return String(x.id) === String(g.product_id); })[0];
    if (p && variantsOf(p)) {
      toast(t('先选好规格，下单时会自动加入这个团', 'Pick an option — checkout will join this group'));
      sessionStorage.setItem('yuki-join-group', g.id);
      openDetail(g.product_id, g.variant_sku);
      return;
    }
    placeOrder([{ id: g.product_id, sku: g.variant_sku || '', qty: 1 }], null, '', '', g.id);
  }

  // ===== 结算 / 下单 =====
  var ADDR = [];
  function loadAddr() {
    if (!USER) return Promise.resolve([]);
    return api('shop_addresses?select=*&order=created_at.desc').then(function (r) { return r.json(); }).then(function (rows) { ADDR = arr(rows); return ADDR; });
  }
  function placeOrder(items, addr, note, coupon, groupId) {
    var btn = document.getElementById('ck-submit');
    if (btn) { btn.disabled = true; btn.textContent = t('提交中…', 'Submitting…'); }
    getUid().then(function (uid) {
      return rpc('shop_place_order', {
        p_items: items, p_address: addr, p_note: note || '', p_coupon: coupon || '',
        p_group_id: groupId || null, p_client_token: 'ct-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8)
      });
    }).then(function (res) {
      if (btn) { btn.disabled = false; btn.textContent = t('提交订单', 'Place order'); }
      if (!res.ok) {
        var msg = res.data && (res.data.message || res.data.msg);
        toast(msg || t('下单失败，再试一次', 'Order failed, try again'));
        return;
      }
      // 从购物车移除已下单项
      var ids = items.map(function (x) { return cartKey(x.id, x.sku); });
      CART = CART.filter(function (x) { return ids.indexOf(cartKey(x.id, x.sku)) === -1; });
      saveCart();
      toast(t('下单成功！', 'Order placed!'));
      if (groupId) sessionStorage.setItem('yuki-join-group', groupId);
      openOrders(res.data.order_id);
    });
  }
  function renderCheckout() {
    if (!USER) { pendingAfterLogin = 'checkout'; renderAccount(); toast(t('先登录再结算哦', 'Log in to check out')); return; }
    var sel = CART.filter(function (x) { return x.checked !== false; });
    var box = document.getElementById('view-checkout');
    if (!sel.length) { box.innerHTML = '<p style="color:var(--muted);text-align:center;padding:40px 0;">' + t('没有勾选要结算的商品', 'Nothing selected to check out') + '</p>'; showView('checkout'); return; }
    var sub = 0; sel.forEach(function (x) { sub += x.price * x.qty; });
    Promise.all([loadAddr(), fetch(SUPABASE_URL + '/rest/v1/site_settings?select=value&key=eq.shop_ship', { headers: { 'apikey': ANON } }).then(function (r) { return r.json(); })]).then(function (res) {
      var ship = {}; try { ship = JSON.parse((res[1] && res[1][0] && res[1][0].value) || '{}'); } catch (e) {}
      var est = parseFloat(ship.flat_est) || 0, fee = parseFloat(ship.service_fee) || 2;
      var joinGid = sessionStorage.getItem('yuki-join-group') || '';
      box.innerHTML =
        '<h2 style="font-size:22px;margin-bottom:14px;">' + t('确认订单', 'Checkout') + '</h2>' +
        '<div class="card" style="padding:18px;margin-bottom:14px;"><b style="font-size:17px;">' + t('商品', 'Items') + '</b>' +
          sel.map(function (x) { return '<div style="display:flex;justify-content:space-between;font-size:16px;margin-top:6px;"><span>' + esc(x.name) + ' × ' + x.qty + '</span><span>¥' + money(x.price * x.qty) + '</span></div>'; }).join('') +
          '<div style="display:flex;justify-content:space-between;font-size:17px;margin-top:10px;border-top:1px dashed var(--accent-soft);padding-top:8px;"><span>' + t('商品小计', 'Subtotal') + '</span><b>¥' + money(sub) + '</b></div>' +
        '</div>' +
        '<div class="card" style="padding:18px;margin-bottom:14px;"><b style="font-size:17px;">' + t('收货地址', 'Shipping address') + '</b><div id="ck-addr" style="margin-top:8px;"></div>' +
          '<button class="buy-btn" id="ck-new-addr" style="margin-top:8px;padding:7px 16px;">' + t('＋ 新地址', '+ New address') + '</button>' +
          '<div id="ck-addr-form" style="display:none;margin-top:10px;"></div>' +
        '</div>' +
        '<div class="card" style="padding:18px;margin-bottom:14px;"><b style="font-size:17px;">' + t('运费', 'Shipping') + '</b>' +
          '<p style="font-size:15px;color:var(--muted);margin-top:4px;">' + t('按 Pirate Ship 实际运费收取：结算显示估算，发货前按实际运费确认，另加服务费。', 'Shipping = actual Pirate Ship cost (estimated below, confirmed before shipment) + service fee.') + '</p>' +
          '<div style="display:flex;justify-content:space-between;font-size:16px;margin-top:8px;"><span>' + t('运费（估算）', 'Shipping (est.)') + '</span><span>¥' + money(est) + '</span></div>' +
          '<div style="display:flex;justify-content:space-between;font-size:16px;"><span>' + t('服务费', 'Service fee') + '</span><span>¥' + money(fee) + '</span></div>' +
        '</div>' +
        '<div class="card" style="padding:18px;margin-bottom:14px;"><b style="font-size:17px;">' + t('优惠码', 'Coupon') + '</b>' +
          '<div style="display:flex;gap:8px;margin-top:8px;"><input id="ck-coupon" placeholder="' + t('有优惠码就填这里', 'Coupon code') + '" style="flex:1;padding:10px 14px;font-size:17px;border:none;border-radius:12px;background:#fff;outline:none;color:var(--text);font-family:inherit;"></div>' +
          '<label style="display:block;margin-top:10px;font-size:16px;">' + t('订单备注', 'Order note') + '<textarea id="ck-note" style="width:100%;min-height:60px;border:none;border-radius:12px;background:#fff;padding:10px 14px;font-family:inherit;font-size:17px;color:var(--text);resize:none;outline:none;margin-top:4px;"></textarea></label>' +
        '</div>' +
        '<div class="card" style="padding:18px;"><div style="display:flex;justify-content:space-between;font-size:19px;"><b>' + t('预估合计', 'Estimated total') + '</b><b style="color:var(--accent);">¥' + money(sub + est + fee) + '</b></div>' +
          '<p style="font-size:14px;color:var(--muted);margin-top:4px;">' + t('以服务端验证后的金额为准；实际运费由后台确认后更新。', 'Final amount is validated server-side; shipping updates once confirmed.') + '</p>' +
          '<button class="buy-btn" id="ck-submit" style="width:100%;margin-top:12px;padding:12px;background:var(--accent);color:#fff;font-size:18px;">' + t('提交订单', 'Place order') + '</button>' +
        '</div>';
      paintAddrPicker();
      document.getElementById('ck-new-addr').addEventListener('click', function () { addrForm('ck-addr-form', null, function () { loadAddr().then(paintAddrPicker); }); });
      document.getElementById('ck-submit').addEventListener('click', function () {
        var a = ADDR.filter(function (x) { return String(x.id) === String(ckAddrId); })[0];
        if (!a) { toast(t('选一个收货地址呀', 'Pick a shipping address')); return; }
        placeOrder(sel.map(function (x) { return { id: x.id, sku: x.sku, qty: x.qty }; }),
          { name: a.name, phone: a.phone, street: a.street, city: a.city, state: a.state, zip: a.zip, country: a.country },
          document.getElementById('ck-note').value.trim(), document.getElementById('ck-coupon').value.trim(), joinGid || null);
      });
      showView('checkout');
    });
  }
  var ckAddrId = null;
  function paintAddrPicker() {
    var box = document.getElementById('ck-addr');
    if (!ADDR.length) { box.innerHTML = '<p style="color:var(--muted);font-size:15px;">' + t('还没有地址，点下面添加', 'No addresses yet — add one below') + '</p>'; return; }
    if (!ckAddrId || !ADDR.filter(function (x) { return x.id === ckAddrId; }).length) {
      var def = ADDR.filter(function (x) { return x.is_default; })[0] || ADDR[0];
      ckAddrId = def.id;
    }
    var g = azGroups(ADDR, function (a) { return a.name || ''; });
    var html = '';
    g.order.forEach(function (L) {
      html += '<div class="az-group" id="az-g-' + L + '"><div class="az-head">' + (L === '#' ? '其他' : L) + '</div>' +
        g.map[L].map(function (a) {
          return '<label style="display:flex;gap:8px;align-items:flex-start;padding:10px;border-radius:12px;background:' + (a.id === ckAddrId ? 'var(--card-hover)' : '#fff') + ';margin-bottom:6px;cursor:pointer;" data-aid="' + escAttr(a.id) + '">' +
            '<span class="addr-dot" style="width:16px;height:16px;border-radius:50%;border:2px solid var(--accent);margin-top:4px;flex-shrink:0;background:' + (a.id === ckAddrId ? 'var(--accent)' : 'transparent') + ';"></span>' +
            '<span style="font-size:16px;">' + esc(a.name) + ' · ' + esc(a.phone) + '<br><span style="color:var(--muted);">' + esc(a.street + ', ' + a.city + ', ' + a.state + ' ' + a.zip + ', ' + a.country) + '</span></span></label>';
        }).join('') + '</div>';
    });
    box.innerHTML = '<div class="az-box" style="padding-right:20px;">' + html + azNavHtml(g.map) + '</div>';
    bindAzNav(box);
    box.querySelectorAll('[data-aid]').forEach(function (lab) {
      lab.addEventListener('click', function () { ckAddrId = lab.getAttribute('data-aid'); paintAddrPicker(); });
    });
  }
  function addrForm(containerId, existing, done) {
    var box = document.getElementById(containerId);
    box.style.display = '';
    var e = existing || {};
    box.innerHTML =
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">' +
        '<input id="af-name" placeholder="' + t('收件人姓名 *', 'Full name *') + '" value="' + escAttr(e.name || '') + '">' +
        '<input id="af-phone" placeholder="' + t('电话 *', 'Phone *') + '" value="' + escAttr(e.phone || '') + '">' +
        '<input id="af-street" placeholder="' + t('街道地址 *', 'Street *') + '" value="' + escAttr(e.street || '') + '" style="grid-column:1/-1;">' +
        '<input id="af-city" placeholder="' + t('城市 *', 'City *') + '" value="' + escAttr(e.city || '') + '">' +
        '<input id="af-state" placeholder="' + t('州/省', 'State') + '" value="' + escAttr(e.state || '') + '">' +
        '<input id="af-zip" placeholder="' + t('ZIP Code', 'ZIP Code') + '" value="' + escAttr(e.zip || '') + '">' +
        '<input id="af-country" placeholder="' + t('国家', 'Country') + '" value="' + escAttr(e.country || 'United States') + '">' +
      '</div>' +
      '<div style="display:flex;gap:8px;margin-top:8px;"><button class="buy-btn" id="af-save" style="padding:8px 18px;">' + t('保存', 'Save') + '</button>' +
      '<button class="buy-btn" id="af-cancel" style="padding:8px 18px;background:#fff;color:var(--muted);">' + t('取消', 'Cancel') + '</button></div>';
    box.querySelectorAll('input').forEach(function (i) {
      i.style.cssText = 'width:100%;padding:10px 12px;font-size:16px;border:1.5px solid var(--accent-soft,#ffc8d6);border-radius:12px;background:#fff;outline:none;color:var(--text,#5d6780);font-family:inherit;box-sizing:border-box;transition:border-color .15s;';
      i.addEventListener('focus', function () { i.style.borderColor = 'var(--accent,#ff6fa5)'; });
      i.addEventListener('blur', function () { i.style.borderColor = 'var(--accent-soft,#ffc8d6)'; });
    });
    document.getElementById('af-cancel').addEventListener('click', function () { box.style.display = 'none'; });
    document.getElementById('af-save').addEventListener('click', function () {
      var body = {
        name: document.getElementById('af-name').value.trim(), phone: document.getElementById('af-phone').value.trim(),
        street: document.getElementById('af-street').value.trim(), city: document.getElementById('af-city').value.trim(),
        state: document.getElementById('af-state').value.trim(), zip: document.getElementById('af-zip').value.trim(),
        country: document.getElementById('af-country').value.trim() || 'United States'
      };
      if (!body.name || !body.street || !body.city) { toast(t('姓名/街道/城市要填哦', 'Name / street / city required')); return; }
      var p = existing ? api('shop_addresses?id=eq.' + existing.id, { method: 'PATCH', body: JSON.stringify(body) })
                       : getUid().then(function (uid) { body.user_id = uid; return api('shop_addresses', { method: 'POST', body: JSON.stringify(body) }); });
      p.then(function (r) {
        if (!r.ok) { toast(t('保存失败，要先登录哦', 'Save failed — log in first')); return; }
        toast(t('地址已保存', 'Address saved'));
        box.style.display = 'none';
        done && done();
      });
    });
  }

  // ===== 我的订单 =====
  var ST_LABEL = {
    pending: ['待付款', 'Awaiting payment', '#e2b100'], reviewing: ['待审核付款', 'Payment under review', '#e29a00'],
    rejected: ['凭证有误', 'Proof rejected', '#d96570'], paid: ['已付款·待发货', 'Paid · to ship', '#9ecfae'],
    shipped: ['已发货', 'Shipped', '#7fb8e8'], completed: ['已完成', 'Completed', '#9ecfae'],
    cancelled: ['已取消', 'Cancelled', '#c4bcb6'], refunding: ['退款处理中', 'Refund processing', '#e2a300'], refunded: ['已退款', 'Refunded', '#c4bcb6']
  };
  function trackUrlOf(carrier, no) {
    if (!no) return '';
    if (/ups/i.test(carrier)) return 'https://www.ups.com/track?tracknum=' + encodeURIComponent(no);
    if (/usps/i.test(carrier)) return 'https://tools.usps.com/go/TrackConfirmAction?tLabels=' + encodeURIComponent(no);
    if (/fedex/i.test(carrier)) return 'https://www.fedex.com/fedextrack/?trknumber=' + encodeURIComponent(no);
    return 'https://www.google.com/search?q=' + encodeURIComponent('tracking ' + no);
  }
  function proofUrl(order) {
    // 私有桶：用自己的 token 换已认证读取流
    if (!order.pay_url || !USER) return Promise.resolve('');
    var path = order.pay_url.replace(/^.*\/object\/(public|authenticated)\/pay\//, '');
    return fetch(SUPABASE_URL + '/storage/v1/object/authenticated/pay/' + path, { headers: { 'apikey': ANON, 'Authorization': 'Bearer ' + USER.a } })
      .then(function (r) { return r.ok ? r.blob() : null; }).then(function (b) { return b ? URL.createObjectURL(b) : ''; });
  }
  function openOrders(focusId) {
    if (!USER) { pendingAfterLogin = 'orders'; renderAccount(); toast(t('先登录查看订单哦', 'Log in to see orders')); return; }
    showView('orders');
    var box = document.getElementById('view-orders');
    box.innerHTML = '<h2 style="font-size:22px;margin-bottom:14px;">' + t('我的订单', 'My Orders') + '</h2><p style="color:var(--muted);text-align:center;">' + t('加载中…', 'Loading…') + '</p>';
    api('shop_orders?select=*&order=created_at.desc&limit=50').then(function (r) { return r.json(); }).then(function (rows) {
      rows = rows || [];
      if (!rows.length) { box.innerHTML += '<p style="color:var(--muted);text-align:center;padding:30px 0;">' + t('还没有订单，去小铺逛逛吧～', 'No orders yet — go shopping~') + '</p>'; return; }
      box.innerHTML = '<h2 style="font-size:22px;margin-bottom:14px;">' + t('我的订单', 'My Orders') + '</h2>' +
        '<div id="order-list">' + rows.map(function (o) { return orderCard(o); }).join('') + '</div>';
      rows.forEach(function (o) { bindOrderCard(o, box, focusId); });
    });
  }
  function orderCard(o) {
    var st = ST_LABEL[o.status] || [o.status, o.status, '#c4bcb6'];
    return '<div class="card" id="oc-' + o.id + '" style="padding:16px;margin-bottom:12px;">' +
      '<div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:6px;align-items:center;">' +
        '<b style="font-size:17px;">' + esc(o.order_no) + '</b>' +
        '<span style="font-size:14px;color:#fff;background:' + st[2] + ';border-radius:999px;padding:3px 12px;">' + esc(st[0]) + '</span>' +
      '</div>' +
      '<div style="font-size:15px;color:var(--muted);margin-top:2px;">' + new Date(o.created_at).toLocaleString() + '</div>' +
      (o.items || []).map(function (it) {
        return '<div style="display:flex;gap:10px;align-items:center;margin-top:8px;">' +
          (it.image ? '<img src="' + escAttr(normImg(it.image)) + '" style="width:44px;height:44px;border-radius:10px;object-fit:cover;">' : '') +
          '<span style="flex:1;font-size:16px;">' + esc(it.name) + ' × ' + it.qty + '</span><span style="font-size:16px;">¥' + money(it.price * it.qty) + '</span></div>';
      }).join('') +
      '<div style="display:flex;justify-content:space-between;font-size:17px;margin-top:8px;border-top:1px dashed var(--accent-soft);padding-top:8px;">' +
        '<span>' + t('应付', 'Total') + '</span><b style="color:var(--accent);">¥' + money(o.total) + '</b></div>' +
      '<div id="oc-body-' + o.id + '" style="display:none;margin-top:10px;"></div>' +
      '<div style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap;">' +
        '<button class="buy-btn oc-more" data-oid="' + escAttr(o.id) + '" style="padding:7px 16px;">' + t('详情 / 付款', 'Details / Pay') + '</button></div>' +
    '</div>';
  }
  function bindOrderCard(o, box, focusId) {
    var card = box.querySelector('#oc-' + o.id);
    var more = card.querySelector('.oc-more');
    more.addEventListener('click', function () {
      var body = card.querySelector('#oc-body-' + o.id);
      if (body.style.display !== 'none') { body.style.display = 'none'; return; }
      body.style.display = '';
      renderOrderBody(o, body);
    });
    if (focusId && o.id === focusId) more.click();
  }
  function renderOrderBody(o, body) {
    var st = ST_LABEL[o.status] || ['', '', ''];
    var addr = o.address || {};
    var html =
      '<div style="font-size:15px;color:var(--muted);line-height:1.7;">' +
        t('收货', 'Ship to') + '：' + esc(addr.name || '') + ' · ' + esc(addr.phone || '') + '<br>' +
        esc([addr.street, addr.city, addr.state, addr.zip, addr.country].filter(Boolean).join(', ')) +
      '</div>' +
      (o.reject_reason ? '<p style="font-size:15px;color:#d96570;margin-top:6px;">' + t('凭证有误：', 'Proof rejected: ') + esc(o.reject_reason) + '</p>' : '') +
      (o.carrier ? '<p style="font-size:15px;margin-top:6px;">' + t('物流', 'Shipping') + '：' + esc(o.carrier) + ' <a href="' + escAttr(trackUrlOf(o.carrier, o.tracking)) + '" target="_blank" style="color:var(--accent);">' + esc(o.tracking) + ' ↗</a>' +
        (o.shipped_at ? ' · ' + new Date(o.shipped_at).toLocaleDateString() : '') + '</p>' : '') +
      '<div style="font-size:15px;color:var(--muted);margin-top:6px;">' + t('明细', 'Breakdown') + '：¥' + money(o.subtotal) + (o.discount > 0 ? ' − 优惠 ¥' + money(o.discount) : '') + ' + 运费 ¥' + money(o.shipping_actual != null ? o.shipping_actual : o.shipping_est) + ' + 服务费 ¥' + money(o.service_fee) + '</div>' +
      '<div style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap;">';
    if (o.status === 'pending' || o.status === 'rejected') {
      html += '<button class="buy-btn oc-pay" style="padding:8px 18px;background:var(--accent);color:#fff;">' + t('上传付款截图', 'Upload payment proof') + '</button>';
    }
    if (o.status === 'reviewing') html += '<span class="no-buy">' + t('凭证已提交，等柚子确认～', 'Proof submitted — awaiting confirmation~') + '</span>';
    if (['pending', 'reviewing', 'rejected'].indexOf(o.status) >= 0) {
      html += '<button class="buy-btn oc-cancel" style="padding:8px 18px;background:#fff;color:var(--muted);">' + t('取消订单', 'Cancel order') + '</button>';
    }
    if (o.status === 'shipped') html += '<button class="buy-btn oc-done" style="padding:8px 18px;">' + t('确认收货', 'Confirm received') + '</button>';
    html += '<button class="buy-btn oc-msg" style="padding:8px 18px;background:#fff;">' + t('留言 / 售后', 'Messages') + '</button>';
    html += '</div><div class="oc-pay-box" style="display:none;margin-top:10px;"></div><div class="oc-msg-box" style="display:none;margin-top:10px;"></div>';
    body.innerHTML = html;
    var payBtn = body.querySelector('.oc-pay');
    if (payBtn) payBtn.addEventListener('click', function () { renderPayUpload(o, body.querySelector('.oc-pay-box')); });
    var cancelBtn = body.querySelector('.oc-cancel');
    if (cancelBtn) cancelBtn.addEventListener('click', function () {
      if (!confirmZh(t('确定取消这个订单吗？', 'Cancel this order?'))) return;
      rpc('shop_cancel_order', { p_order_id: o.id }).then(function (res) {
        if (!res.ok) { toast((res.data && res.data.message) || t('取消失败', 'Cancel failed')); return; }
        toast(t('已取消', 'Cancelled')); openOrders();
      });
    });
    var doneBtn = body.querySelector('.oc-done');
    if (doneBtn) doneBtn.addEventListener('click', function () {
      api('shop_orders?id=eq.' + o.id, { method: 'PATCH', body: JSON.stringify({ status: 'completed' }) }).then(function (r) {
        if (!r.ok) { toast(t('操作失败', 'Failed')); return; }
        toast(t('已确认收货，谢谢～', 'Confirmed, thank you~')); openOrders();
      });
    });
    var msgBtn = body.querySelector('.oc-msg');
    if (msgBtn) msgBtn.addEventListener('click', function () { renderOrderMsgs(o, body.querySelector('.oc-msg-box')); });
    // 已传过凭证 → 显示缩略图
    if (o.pay_url) {
      proofUrl(o).then(function (u) {
        if (u) { var img = document.createElement('img'); img.src = u; img.style.cssText = 'width:90px;height:90px;object-fit:cover;border-radius:10px;margin-top:8px;'; body.appendChild(img); }
      });
    }
    // 包裹物流（多包裹：shop_packages；旧单回退订单自带字段）
    var pkBox = document.createElement('div');
    body.appendChild(pkBox);
    api('shop_packages?select=*&order_id=eq.' + o.id + '&order=created_at.asc').then(function (r) { return r.json(); }).then(function (rows) {
      var pks = arr(rows);
      var list = pks.length ? pks.map(function (p) { return { carrier: p.carrier, tracking: p.tracking, track_url: p.track_url, shipped_at: p.shipped_at, note: p.note }; })
        : (o.tracking ? [{ carrier: o.carrier, tracking: o.tracking, track_url: o.track_url, shipped_at: o.shipped_at, note: o.ship_note }] : []);
      if (!list.length) return;
      pkBox.innerHTML = '<div style="font-size:16px;font-weight:700;margin-top:10px;">' + t('包裹物流', 'Packages') + '</div>' + list.map(function (p, i) {
        return '<div style="font-size:15px;color:var(--text);margin-top:6px;">' + t('包裹', 'Package') + ' ' + (i + 1) + '：' + esc(p.carrier || '') + ' ' + esc(p.tracking || '') +
          (p.track_url ? ' <a href="' + escAttr(p.track_url) + '" target="_blank" rel="noopener" style="color:var(--accent);">' + t('查询', 'Track') + '</a>' : '') +
          (p.shipped_at ? ' · ' + esc(String(p.shipped_at).slice(0, 10)) : '') +
          (p.note ? ' · ' + esc(p.note) : '') + '</div>';
      }).join('');
    }).catch(function () {});
  }
  function confirmZh(msg) { return window.confirm(msg); }
  function renderPayUpload(o, box) {
    box.style.display = '';
    box.innerHTML =
      '<div class="card" style="padding:14px;background:var(--card);">' +
        '<p style="font-size:15px;color:var(--muted);">' + t('微信/支付宝付款后，把截图传上来，柚子确认后就发货～ 收款方式在小铺页面最下面。', 'Pay via WeChat/Alipay (QR codes at the bottom of the shop page), then upload your screenshot here.') + '</p>' +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px;">' +
          '<input id="pu-amount" placeholder="' + t('付款金额', 'Amount paid') + '">' +
          '<input id="pu-channel" placeholder="' + t('付款渠道（微信/支付宝…）', 'Channel (WeChat/Alipay…)') + '">' +
          '<input id="pu-time" placeholder="' + t('付款时间（如 10-23 21:00）', 'Time paid') + '" style="grid-column:1/-1;">' +
        '</div>' +
        '<div style="margin-top:8px;display:flex;gap:8px;align-items:center;">' +
          '<label class="buy-btn" style="padding:7px 16px;cursor:pointer;">' + t('选择截图', 'Choose screenshot') + '<input id="pu-file" type="file" accept="image/*" hidden></label>' +
          '<span id="pu-name" style="font-size:15px;color:var(--muted);">' + t('未选择', 'None') + '</span>' +
          '<button class="buy-btn" id="pu-go" style="padding:8px 18px;background:var(--accent);color:#fff;margin-left:auto;">' + t('提交凭证', 'Submit proof') + '</button>' +
        '</div>' +
      '</div>';
    box.querySelectorAll('input:not([type=file])').forEach(function (i) { i.style.cssText = 'width:100%;padding:10px 12px;font-size:16px;border:none;border-radius:12px;background:#fff;outline:none;color:var(--text);font-family:inherit;'; });
    var file = null;
    box.querySelector('#pu-file').addEventListener('change', function () {
      file = this.files[0] || null;
      box.querySelector('#pu-name').textContent = file ? file.name : t('未选择', 'None');
    });
    box.querySelector('#pu-go').addEventListener('click', function () {
      if (!file) { toast(t('先选一张截图哦', 'Pick a screenshot first')); return; }
      getUid().then(function (uid) {
        var path = uid + '/order-' + o.id + '-' + Date.now() + '.' + (file.name.split('.').pop() || 'jpg').replace(/[^\w]/g, '');
        return fetch(SUPABASE_URL + '/storage/v1/object/pay/' + path, {
          method: 'POST', headers: { 'apikey': ANON, 'Authorization': 'Bearer ' + USER.a, 'Content-Type': file.type || 'image/jpeg' }, body: file
        }).then(function (r) { if (!r.ok) throw new Error('up'); return SUPABASE_URL + '/storage/v1/object/authenticated/pay/' + path; });
      }).then(function (url) {
        return api('shop_orders?id=eq.' + o.id, { method: 'PATCH', body: JSON.stringify({
          pay_url: url, pay_amount: parseFloat(box.querySelector('#pu-amount').value) || null,
          pay_channel: box.querySelector('#pu-channel').value.trim(), pay_time: box.querySelector('#pu-time').value.trim(),
          status: 'reviewing'
        }) });
      }).then(function (r) {
        if (!r.ok) { toast(t('提交失败，请确认已登录', 'Submit failed — make sure you are logged in')); return; }
        toast(t('凭证已提交，等审核～', 'Proof submitted for review~'));
        openOrders(o.id);
      }).catch(function () { toast(t('上传失败，再试一次', 'Upload failed, try again')); });
    });
  }
  function renderOrderMsgs(o, box) {
    box.style.display = box.style.display === 'none' || !box.innerHTML ? '' : 'none';
    api('shop_order_msgs?select=*&order_id=eq.' + o.id + '&order=created_at.asc').then(function (r) { return r.json(); }).then(function (rows) {
      rows = rows || [];
      box.innerHTML = '<div class="card" style="padding:14px;background:var(--card);">' +
        (rows.length ? rows.map(function (m) {
          return '<div style="font-size:15px;margin-bottom:6px;"><b>' + (m.is_admin ? '柚子' : t('我', 'Me')) + '：</b>' + esc(m.text) +
            ' <span style="color:var(--muted);font-size:13px;">' + new Date(m.created_at).toLocaleString() + '</span></div>';
        }).join('') : '<p style="font-size:15px;color:var(--muted);">' + t('有什么想问的写在这里～', 'Ask anything about this order~') + '</p>') +
        '<div style="display:flex;gap:8px;margin-top:8px;"><input id="om-text" placeholder="' + t('订单咨询 / 售后说明', 'Question / after-sales note') + '" style="flex:1;padding:10px 12px;font-size:16px;border:none;border-radius:12px;background:#fff;outline:none;color:var(--text);font-family:inherit;">' +
        '<button class="buy-btn" id="om-go" style="padding:8px 16px;">' + t('发送', 'Send') + '</button></div></div>';
      box.querySelector('#om-go').addEventListener('click', function () {
        var text = box.querySelector('#om-text').value.trim();
        if (!text) return;
        getUid().then(function (uid) {
          return api('shop_order_msgs', { method: 'POST', body: JSON.stringify({ order_id: o.id, user_id: uid, is_admin: false, type: 'msg', text: text }) });
        }).then(function (r) {
          if (!r.ok) { toast(t('发送失败', 'Failed')); return; }
          toast(t('已发送', 'Sent'));
          renderOrderMsgs(o, box); box.style.display = '';
        });
      });
    });
  }

  // ===== 账号 =====
  var pendingAfterLogin = null;
  function renderAccount() {
    var box = document.getElementById('view-account');
    if (!USER) {
      box.innerHTML =
        '<h2 style="font-size:22px;margin-bottom:14px;">' + t('我的账号', 'My Account') + '</h2>' +
        '<div class="card" style="padding:18px;">' +
          '<div style="display:flex;gap:8px;margin-bottom:14px;">' +
            '<button class="buy-btn acct-tab on" data-v="login" style="padding:8px 20px;">' + t('登录', 'Log in') + '</button>' +
            '<button class="buy-btn acct-tab" data-v="reg" style="padding:8px 20px;background:#fff;">' + t('注册', 'Sign up') + '</button>' +
          '</div>' +
          '<div id="ac-login">' +
            '<input id="li-email" placeholder="Email" style="width:100%;margin-bottom:12px;">' +
            '<input id="li-pw" type="password" placeholder="' + t('密码', 'Password') + '" style="width:100%;margin-bottom:12px;">' +
            '<button class="buy-btn" id="li-go" style="width:100%;padding:11px;background:#ffd9e6;color:#a04a68;font-size:17px;">' + t('登录', 'Log in') + '</button>' +
            '<button id="li-forgot" style="background:none;border:none;color:var(--muted);font-family:inherit;font-size:15px;margin-top:10px;cursor:pointer;">' + t('忘记密码？发重置邮件', 'Forgot password? Send reset email') + '</button>' +
          '</div>' +
          '<div id="ac-reg" style="display:none;">' +
            '<p style="font-size:14px;color:var(--muted);margin-bottom:8px;">' + t('注册即创建买家账号（邮箱可能需要点击验证邮件）。', 'Sign up creates your buyer account (email verification may be required).') + '</p>' +
            '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">' +
              '<input id="rg-name" placeholder="' + t('姓名 *', 'Full name *') + '">' +
              '<input id="rg-nick" placeholder="' + t('昵称（选填）', 'Nickname (optional)') + '">' +
              '<input id="rg-email" placeholder="Email *" style="grid-column:1/-1;">' +
              '<input id="rg-phone" placeholder="' + t('电话 *', 'Phone *') + '" style="grid-column:1/-1;">' +
              '<input id="rg-pw" type="password" placeholder="' + t('密码 *（至少 6 位）', 'Password * (6+ chars)') + '" style="grid-column:1/-1;">' +
            '</div>' +
            '<p style="font-size:16px;margin:10px 0 4px;">' + t('收货地址', 'Shipping address') + '</p>' +
            '<div id="rg-addr"></div>' +
            '<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:12px;padding:10px 12px;border:1.5px solid var(--accent-soft,#ffc8d6);border-radius:12px;background:#fff;">' +
              '<span style="font-size:16px;color:var(--text,#5d6780);">' + t('接收新品上架通知', 'Notify me about new items') + '<br><span style="font-size:13px;color:var(--muted,#9aa5bd);">' + t('默认关闭 · 邮件通知服务尚未配置，启用前不会发送邮件', 'Off by default · email delivery not configured yet') + '</span></span>' +
              subToggleHtml('rg-notify', false) +
            '</div>' +
            '<button class="buy-btn" id="rg-go" style="width:100%;padding:11px;background:#ffd9e6;color:#a04a68;font-size:17px;margin-top:14px;">' + t('注册', 'Create account') + '</button>' +
          '</div>' +
        '</div>';
      styleInputs(box);
      styleTabs(box);
      var rgN = document.getElementById('rg-notify');
      bindSubToggle(rgN, function () { return null; }, function (on) { window.__rgNotifyWanted = on; });
      box.querySelectorAll('.acct-tab').forEach(function (b) {
        b.addEventListener('click', function () {
          paintTabs(box, b);
          document.getElementById('ac-login').style.display = b.getAttribute('data-v') === 'login' ? '' : 'none';
          document.getElementById('ac-reg').style.display = b.getAttribute('data-v') === 'reg' ? '' : 'none';
        });
      });
      document.getElementById('li-go').addEventListener('click', doLogin);
      document.getElementById('li-forgot').addEventListener('click', function () {
        var email = document.getElementById('li-email').value.trim();
        if (!email) { toast(t('先填邮箱再点重置', 'Enter your email first')); return; }
        fetch(SUPABASE_URL + '/auth/v1/recover', { method: 'POST', headers: { 'apikey': ANON, 'Content-Type': 'application/json' }, body: JSON.stringify({ email: email }) })
          .then(function (r) { toast(r.ok ? t('重置邮件已发送，去邮箱查收', 'Reset email sent — check your inbox') : t('发送失败（邮件服务可能限流），稍后再试', 'Send failed (email rate limit?) — try later')); });
      });
      addrForm('rg-addr', null, null);
      document.getElementById('rg-go').addEventListener('click', doRegister);
      showView('account');
      return;
    }
    // 已登录：资料 + 地址
    Promise.all([
      api('shop_profiles?select=*&id=eq.' + 'x').then(function () { return null; }).catch(function () { return null; }),
      getUid()
    ]).then(function (r2) {
      var uid = r2[1];
      Promise.all([
        api('shop_profiles?select=*&id=eq.' + uid).then(function (r) { return r.json(); }),
        api('shop_addresses?select=*&order=created_at.desc').then(function (r) { return r.json(); })
      ]).then(function (res) {
        var prof = (arr(res[0]))[0] || {};
        ADDR = arr(res[1]);
        var prof0 = prof;
        function profileDisplay(p) {
          var row = function (label, val) {
            var v = (val && String(val).trim()) ? esc(val) : '<span style="color:var(--muted,#9aa5bd);">' + t('尚未填写', 'Not set') + '</span>';
            return '<span style="color:var(--muted,#9aa5bd);font-size:15px;">' + label + '</span><span style="font-size:16px;word-break:break-all;">' + v + '</span>';
          };
          return '<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:12px;">' +
              '<b style="font-size:17px;">' + t('基本资料', 'Basic info') + '</b>' +
              '<button class="buy-btn" id="pf-edit" style="padding:7px 18px;background:#ffd9e6;color:#a04a68;">' + t('编辑', 'Edit') + '</button>' +
            '</div>' +
            '<div style="display:grid;grid-template-columns:76px 1fr;row-gap:10px;column-gap:12px;align-items:baseline;">' +
              row(t('邮箱', 'Email'), USER.email || '') +
              row(t('姓名', 'Name'), p.name || '') +
              row(t('昵称', 'Nickname'), p.nickname || '') +
              row(t('电话', 'Phone'), p.phone || '') +
            '</div>' +
            '<button class="buy-btn" id="pf-out" style="margin-top:14px;padding:9px 20px;background:#fff;color:var(--muted);">' + t('退出登录', 'Log out') + '</button>';
        }
        function profileEdit(p, errMsg) {
          return '<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:12px;">' +
              '<b style="font-size:17px;">' + t('编辑资料', 'Edit info') + '</b>' +
            '</div>' +
            '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">' +
              '<input id="pf-name" placeholder="' + t('姓名', 'Full name') + '" value="' + escAttr(p.name || '') + '">' +
              '<input id="pf-nick" placeholder="' + t('昵称', 'Nickname') + '" value="' + escAttr(p.nickname || '') + '">' +
              '<input id="pf-phone" placeholder="' + t('电话', 'Phone') + '" value="' + escAttr(p.phone || '') + '" style="grid-column:1/-1;">' +
            '</div>' +
            (errMsg ? '<p id="pf-err" style="color:#d96570;font-size:14px;margin:10px 0 0;">' + esc(errMsg) + '</p>' : '') +
            '<div style="display:flex;gap:10px;margin-top:14px;">' +
              '<button class="buy-btn" id="pf-save" style="padding:9px 22px;background:#ffd9e6;color:#a04a68;">' + t('保存', 'Save') + '</button>' +
              '<button class="buy-btn" id="pf-cancel" style="padding:9px 22px;background:#fff;color:var(--muted);">' + t('取消', 'Cancel') + '</button>' +
            '</div>';
        }
        function paintProfile(p, editing, errMsg) {
          var card = document.getElementById('pf-card');
          card.innerHTML = editing ? profileEdit(p, errMsg) : profileDisplay(p);
          if (editing) {
            styleInputs(card);
            card.querySelector('#pf-cancel').addEventListener('click', function () { paintProfile(p, false); });
            card.querySelector('#pf-save').addEventListener('click', function () {
              var btn = card.querySelector('#pf-save');
              if (btn.dataset.busy) return; // 防重复提交
              btn.dataset.busy = '1'; btn.disabled = true; btn.textContent = t('保存中…', 'Saving…');
              var restoreBtn = function () { btn.dataset.busy = ''; btn.disabled = false; btn.textContent = t('保存', 'Save'); };
              var body = {
                id: uid, name: card.querySelector('#pf-name').value.trim(),
                nickname: card.querySelector('#pf-nick').value.trim(), phone: card.querySelector('#pf-phone').value.trim()
              };
              api('shop_profiles?on_conflict=id', { method: 'POST', headers: { 'Prefer': 'resolution=merge-duplicates' }, body: JSON.stringify(body) }).then(function (r) {
                if (r.ok) { prof0 = body; paintProfile(body, false); toast(t('已保存', 'Saved')); }
                else { restoreBtn(); paintProfile(body, true, t('保存失败，请检查网络后重试', 'Save failed — check your connection and retry')); }
              }).catch(function () { restoreBtn(); paintProfile(p, true, t('保存失败，请检查网络后重试', 'Save failed — check your connection and retry')); });
            });
          } else {
            card.querySelector('#pf-edit').addEventListener('click', function () { paintProfile(p, true); });
          }
          var out = card.querySelector('#pf-out');
          if (out) out.addEventListener('click', function () {
            USER = null; UID = null; saveUser(); // 统一清空双键，退出即全站退出
            try { localStorage.setItem('yuki-cart-merge-done', '0'); } catch (e) {}
            window.__YK_MENU_OK = false; window.__YK_MENU_CHECKED = false;
            try { window.YK_EXCLUSIVE_MEMO = null; } catch (e) {}
            try { if (window.SiteMenu) SiteMenu.refresh(); } catch (e) {}
            loadFavsLocal(); paintFavs(); paintAcctIcon();
            toast(t('已退出', 'Logged out'));
            renderAccount();
          });
        }
        box.innerHTML =
          '<h2 style="font-size:22px;margin-bottom:14px;">' + t('我的账号', 'My Account') + '</h2>' +
          '<div class="card" id="pf-card" style="padding:18px;margin-bottom:14px;"></div>' +
          '<div class="card" style="padding:18px;margin-bottom:14px;">' +
            '<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;">' +
              '<span style="font-size:16px;color:var(--text,#5d6780);">' + t('接收新品上架通知', 'Notify me about new items') + '<br><span style="font-size:13px;color:var(--muted,#9aa5bd);">' + t('邮件通知服务尚未配置，启用前不会发送邮件', 'Email delivery not configured yet — no emails will be sent until enabled') + '</span></span>' +
              subToggleHtml('pf-notify', !!(prof0 && prof0.notify_new) || subRead()) +
            '</div>' +
          '</div>' +
          '<div class="card" style="padding:18px;">' +
            '<b style="font-size:17px;">' + t('收货地址', 'Addresses') + '</b><div id="pf-addr" style="margin-top:8px;"></div>' +
            '<button class="buy-btn" id="pf-add" style="margin-top:8px;padding:7px 16px;">' + t('＋ 新地址', '+ New address') + '</button>' +
            '<div id="pf-addr-form"></div>' +
          '</div>';
        paintProfile(prof0, false);
        styleInputs(box); // 通知/地址区块内输入框统一样式（资料卡编辑态在 paintProfile 内单独处理）
        bindSubToggle(document.getElementById('pf-notify'), function () { return uid; });
        paintMyAddr();
        document.getElementById('pf-add').addEventListener('click', function () { addrForm('pf-addr-form', null, function () { loadAddr().then(paintMyAddr); }); });
        renderFavsInAccount();
        showView('account');
      });
    });
  }
  // ── A–Z 字母索引（地址/联系人列表：拼音分组 + 右侧导航）──
  var AZ_COLL = (function () { try { return new Intl.Collator('zh-u-co-pinyin'); } catch (e) { return null; } })();
  // ICU 的 zh 拼音排序中全部汉字排在拉丁字母之前，首字母需用汉字代表字做分界
  var AZ_BD = [['A','阿'],['B','八'],['C','擦'],['D','搭'],['E','蛾'],['F','发'],['G','噶'],['H','哈'],['J','鸡'],['K','喀'],['L','垃'],['M','妈'],['N','拿'],['O','哦'],['P','啪'],['Q','七'],['R','然'],['S','撒'],['T','塌'],['W','挖'],['X','西'],['Y','压'],['Z','匝']];
  function azInitial(name) {
    var s = String(name || '').trim();
    if (!s) return '#';
    if (/[a-zA-Z]/.test(s[0])) return s[0].toUpperCase();
    if (!AZ_COLL) return '#';
    if (AZ_COLL.compare(s, AZ_BD[0][1]) < 0) return '#';
    for (var i = 0; i < AZ_BD.length; i++) {
      if (AZ_COLL.compare(s, AZ_BD[i][1]) >= 0 && (i + 1 >= AZ_BD.length || AZ_COLL.compare(s, AZ_BD[i + 1][1]) < 0)) return AZ_BD[i][0];
    }
    return '#';
  }
  function azGroups(items, nameFn) {
    var sorted = items.slice().sort(function (a, b) {
      var ia = azInitial(nameFn(a)), ib = azInitial(nameFn(b));
      if (ia !== ib) return ia === '#' ? 1 : ib === '#' ? -1 : ia.localeCompare(ib);
      var an = String(nameFn(a) || ''), bn = String(nameFn(b) || '');
      return (AZ_COLL ? AZ_COLL.compare(an, bn) : an.localeCompare(bn)) || an.localeCompare(bn);
    });
    var map = {}, order = [];
    sorted.forEach(function (it) {
      var L = azInitial(nameFn(it));
      if (!map[L]) { map[L] = []; order.push(L); }
      map[L].push(it);
    });
    order.sort(function (a, b) { if (a === '#') return -1; if (b === '#') return 1; return a.localeCompare(b); });
    return { map: map, order: order };
  }
  function azNavHtml(map) {
    var out = '<div class="az-nav" aria-hidden="true">';
    'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').forEach(function (L) {
      out += '<span class="az-letter' + (map[L] ? ' az-has' : ' az-off') + '" data-l="' + L + '">' + L + '</span>';
    });
    return out + '</div>';
  }
  function bindAzNav(root) {
    root.querySelectorAll('.az-letter.az-has').forEach(function (sp) {
      sp.addEventListener('click', function () {
        root.querySelectorAll('.az-cur').forEach(function (x) { x.classList.remove('az-cur'); });
        sp.classList.add('az-cur');
        var g = root.querySelector('#az-g-' + sp.getAttribute('data-l'));
        if (g) g.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });
  }
  function paintMyAddr() {
    var box = document.getElementById('pf-addr');
    if (!ADDR.length) { box.innerHTML = '<p style="color:var(--muted);font-size:15px;">' + t('还没有地址', 'No addresses yet') + '</p>'; return; }
    var g = azGroups(ADDR, function (a) { return a.name || ''; });
    var html = '';
    g.order.forEach(function (L) {
      html += '<div class="az-group" id="az-g-' + L + '"><div class="az-head">' + (L === '#' ? '其他' : L) + '</div>' +
        g.map[L].map(function (a) {
          return '<div style="display:flex;gap:8px;align-items:center;padding:10px;border-radius:12px;background:#fff;margin-bottom:6px;">' +
            '<div style="flex:1;font-size:15px;min-width:0;">' + esc(a.name) + ' · ' + esc(a.phone) + (a.is_default ? ' <span style="color:var(--accent);font-size:13px;">' + t('默认', 'Default') + '</span>' : '') + '<br><span style="color:var(--muted);">' + esc(a.street + ', ' + a.city + ', ' + a.state + ' ' + a.zip + ', ' + a.country) + '</span></div>' +
            '<button class="buy-btn ad-def" data-id="' + escAttr(a.id) + '" style="padding:5px 10px;font-size:14px;">' + t('设默认', 'Default') + '</button>' +
            '<button class="buy-btn ad-edit" data-id="' + escAttr(a.id) + '" style="padding:5px 10px;font-size:14px;">' + t('编辑', 'Edit') + '</button>' +
            '<button class="buy-btn ad-del" data-id="' + escAttr(a.id) + '" style="padding:5px 10px;font-size:14px;background:#fff;color:#d96570;">' + t('删除', 'Del') + '</button>' +
          '</div>';
        }).join('') + '</div>';
    });
    box.innerHTML = '<div class="az-box" style="padding-right:20px;">' + html + azNavHtml(g.map) + '</div>';
    bindAzNav(box);
    box.querySelectorAll('.ad-def').forEach(function (b) { b.addEventListener('click', function () {
      var id = b.getAttribute('data-id');
      api('shop_addresses?user_id=eq.' + UID, { method: 'PATCH', body: JSON.stringify({ is_default: false }) }).then(function () {
        return api('shop_addresses?id=eq.' + id, { method: 'PATCH', body: JSON.stringify({ is_default: true }) });
      }).then(function () { toast(t('已设为默认', 'Default set')); loadAddr().then(paintMyAddr); });
    }); });
    box.querySelectorAll('.ad-edit').forEach(function (b) { b.addEventListener('click', function () {
      var a = ADDR.filter(function (x) { return x.id === b.getAttribute('data-id'); })[0];
      addrForm('pf-addr-form', a, function () { loadAddr().then(paintMyAddr); });
    }); });
    box.querySelectorAll('.ad-del').forEach(function (b) { b.addEventListener('click', function () {
      if (!confirmZh(t('删除这个地址？', 'Delete this address?'))) return;
      api('shop_addresses?id=eq.' + b.getAttribute('data-id'), { method: 'DELETE' }).then(function () { toast(t('已删除', 'Deleted')); loadAddr().then(paintMyAddr); });
    }); });
  }
  function doLogin() {
    var email = document.getElementById('li-email').value.trim();
    var pw = document.getElementById('li-pw').value;
    if (!email || !pw) { toast(t('邮箱和密码都要填', 'Email & password required')); return; }
    fetch(SUPABASE_URL + '/auth/v1/token?grant_type=password', {
      method: 'POST', headers: { 'apikey': ANON, 'Content-Type': 'application/json' }, body: JSON.stringify({ email: email, password: pw })
    }).then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); }).then(function (res) {
      if (!res.ok || !res.j.access_token) { toast((res.j.msg) || t('登录失败，检查邮箱密码', 'Login failed')); return; }
      USER = { a: res.j.access_token, r: res.j.refresh_token, email: email }; saveUser();
      // 柚子专属账号：直接进入原有专属后台，不落普通买家账户页（会话已由 saveUser 统一写入后台键）
      if (email.toLowerCase() === YK_EXCLUSIVE_EMAIL) {
        toast(t('专属身份已确认，正在进入后台…', 'Yuki mode — opening admin…'));
        setTimeout(function () { location.href = '/admin.html'; }, 500);
        return;
      }
      toast(t('欢迎回来～', 'Welcome back~'));
      afterLogin();
    });
  }
  function doRegister() {
    var name = document.getElementById('rg-name').value.trim();
    var nick = document.getElementById('rg-nick').value.trim();
    var email = document.getElementById('rg-email').value.trim();
    var phone = document.getElementById('rg-phone').value.trim();
    var pw = document.getElementById('rg-pw').value;
    var addr = {
      name: document.getElementById('af-name') ? document.getElementById('af-name').value.trim() : '',
      phone: document.getElementById('af-phone') ? document.getElementById('af-phone').value.trim() : '',
      street: document.getElementById('af-street') ? document.getElementById('af-street').value.trim() : '',
      city: document.getElementById('af-city') ? document.getElementById('af-city').value.trim() : '',
      state: document.getElementById('af-state') ? document.getElementById('af-state').value.trim() : '',
      zip: document.getElementById('af-zip') ? document.getElementById('af-zip').value.trim() : '',
      country: document.getElementById('af-country') ? document.getElementById('af-country').value.trim() : 'United States'
    };
    if (!name || !email || !phone || !pw) { toast(t('姓名/邮箱/电话/密码都要填', 'Name / email / phone / password required')); return; }
    if (pw.length < 6) { toast(t('密码至少 6 位', 'Password: 6+ chars')); return; }
    fetch(SUPABASE_URL + '/auth/v1/signup', {
      method: 'POST', headers: { 'apikey': ANON, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email, password: pw, data: { name: name, nickname: nick, phone: phone } })
    }).then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); }).then(function (res) {
      if (!res.ok || res.j.error_code) { toast((res.j.msg) || t('注册失败', 'Sign up failed')); return; }
      if (res.j.access_token) {
        USER = { a: res.j.access_token, r: res.j.refresh_token, email: email }; saveUser();
        toast(t('注册成功！', 'Account created!'));
        afterLogin(addr, { name: name, nickname: nick, phone: phone });
      } else {
        toast(t('验证邮件已发送，验证后就能登录啦', 'Verification email sent — verify then log in'));
      }
    });
  }
  function afterLogin(addr, prof) {
    paintAcctIcon(); loadFavs();
    if (window.__rgNotifyWanted) {
      getUid().then(function (uid) { if (uid) subWrite(true, uid); });
      window.__rgNotifyWanted = false;
    }
    // 本地购物车合并到云端（云端已有的拉下来合并）
    getUid().then(function (uid) {
      if (!uid) { route(); return; }
      var p1 = api('shop_carts?select=*&user_id=eq.' + uid).then(function (r) { return r.json(); });
      p1.then(function (rows) {
        var cloud = (Array.isArray(rows) && rows[0] && rows[0].items) || [];
        cloud.forEach(function (c) {
          var k = cartKey(c.id, c.sku);
          if (!CART.filter(function (x) { return cartKey(x.id, x.sku) === k; }).length) CART.push(c);
        });
        saveCart();
      }).then(function () {
        var p2 = api('shop_profiles?on_conflict=id', { method: 'POST', headers: { 'Prefer': 'resolution=merge-duplicates' },
          body: JSON.stringify(Object.assign({ id: uid }, prof || {})) });
        var p3 = addr && addr.street ? api('shop_addresses', { method: 'POST', body: JSON.stringify(Object.assign({ user_id: uid }, addr)) }) : Promise.resolve();
        Promise.all([p2, p3]).then(function () { if (!goNextAfterLogin()) route(); });
      });
    });
  }

  // ===== 顶栏入口（顺序固定：购物车 → 登录/我的账号 → 汉堡）=====
  function paintAcctIcon() {
    var acct = document.getElementById('tb-account');
    if (!acct) return;
    var a = acct.querySelector('.tb-ic-in'), b2 = acct.querySelector('.tb-ic-out');
    if (a) a.style.display = USER ? '' : 'none';
    if (b2) b2.style.display = USER ? 'none' : '';
  }
  function bindTopbar() {
    var cart = document.getElementById('tb-cart');
    var acct = document.getElementById('tb-account');
    if (cart) cart.addEventListener('click', function () { renderCart(); showView('cart'); });
    if (acct) acct.addEventListener('click', function () { renderAccount(); showView('account'); });
    paintAcctIcon();
  }
  // Index 统一账户区域在商城页内的直达入口（site-menu.js 调用）
  window.__shopNav = function (which) {
    if (which === 'cart') { renderCart(); showView('cart'); }
    else { renderAccount(); showView('account'); }
  };
  function goNextAfterLogin() {
    try {
      var nx = new URLSearchParams(location.search).get('next');
      if (nx && (/^\/[^/]/.test(nx) || nx.indexOf('https://chengyuki119.github.io') === 0)) { location.href = nx; return true; }
    } catch (e) {}
    return false;
  }

  // ===== 收藏（登录后云端 shop_favorites，未登录本地，登录时合并上云）=====
  var FAVS = [];
  function loadFavsLocal() { try { FAVS = JSON.parse(localStorage.getItem('yuki-favs') || '[]'); } catch (e) { FAVS = []; } if (!Array.isArray(FAVS)) FAVS = []; }
  function saveFavsLocal() { try { localStorage.setItem('yuki-favs', JSON.stringify(FAVS)); } catch (e) {} }
  function pushFavSrv(id) {
    getUid().then(function (uid) {
      if (!uid) return;
      api('shop_favorites', { method: 'POST', headers: { 'Prefer': 'resolution=merge-duplicates' }, body: JSON.stringify({ user_id: uid, product_id: id }) }).catch(function () {});
    });
  }
  function loadFavs() {
    loadFavsLocal();
    if (!USER || !USER.a) { paintFavs(); return; }
    api('shop_favorites?select=product_id').then(function (r) { return r.json(); }).then(function (rows) {
      if (!Array.isArray(rows)) return;
      var ids = rows.map(function (x) { return String(x.product_id); });
      FAVS.forEach(function (id) { if (ids.indexOf(String(id)) === -1 && /^[0-9a-f-]{36}$/i.test(String(id))) pushFavSrv(id); }); // 本地合并上云（仅真实 uuid）
      var merged = ids.slice();
      FAVS.forEach(function (id) { if (merged.indexOf(String(id)) === -1) merged.push(String(id)); });
      FAVS = merged; saveFavsLocal(); paintFavs();
    }).catch(function () {});
  }
  function isFav(id) { return FAVS.map(String).indexOf(String(id)) !== -1; }
  function toggleFav(id) {
    var s = String(id);
    if (isFav(s)) {
      FAVS = FAVS.filter(function (x) { return String(x) !== s; });
      if (USER) getUid().then(function (uid) { if (uid) api('shop_favorites?user_id=eq.' + uid + '&product_id=eq.' + s, { method: 'DELETE' }).catch(function () {}); });
    } else {
      FAVS.push(s);
      if (USER) pushFavSrv(s);
    }
    saveFavsLocal(); paintFavs();
  }
  function paintFavs() {
    document.querySelectorAll('[data-fav]').forEach(function (b) {
      var on = isFav(b.getAttribute('data-fav'));
      b.classList.toggle('on', on);
      b.textContent = on ? '♥' : '♡';
    });
  }
  document.addEventListener('click', function (e) {
    var f = e.target.closest ? e.target.closest('[data-fav]') : null;
    if (!f) return;
    e.preventDefault(); e.stopPropagation();
    toggleFav(f.getAttribute('data-fav'));
  }, true);
  function renderFavsInAccount() {
    var box = document.getElementById('view-account');
    if (!box || !USER) return;
    var old = document.getElementById('fav-section'); if (old) old.remove();
    var sec = document.createElement('div');
    sec.id = 'fav-section';
    sec.style.cssText = 'background:var(--card);border-radius:var(--radius,18px);padding:16px;margin-top:14px;';
    var items = FAVS.map(function (id) { return PRODUCTS.filter(function (p) { return String(p.id) === String(id); })[0]; }).filter(Boolean);
    sec.innerHTML = '<b style="font-size:17px;">' + t('我的收藏', 'Favorites') + '</b>' +
      (items.length ? '<div class="grid" style="margin-top:10px;">' + items.map(productCardShop).join('') + '</div>'
                    : '<p style="font-size:15px;color:var(--muted);margin:8px 0 0;">' + t('还没有收藏，去逛逛点 ♡ 收起来', 'Nothing saved yet — tap ♡ on any item') + '</p>');
    box.appendChild(sec);
    var g2 = sec.querySelector('.grid'); if (g2) bindCards(g2);
    paintFavs();
  }

  // ===== 购物车视图 =====
  function renderCart() {
    var box = document.getElementById('view-cart');
    if (!CART.length) { box.innerHTML = '<h2 style="font-size:22px;margin-bottom:14px;">' + t('购物车', 'Cart') + '</h2><p style="color:var(--muted);text-align:center;padding:30px 0;">' + t('购物车空空的，去小铺逛逛～', 'Cart is empty — go shopping~') + '</p>'; showView('cart'); return; }
    var sub = 0; CART.forEach(function (x) { if (x.checked !== false) sub += x.price * x.qty; });
    box.innerHTML =
      '<h2 style="font-size:22px;margin-bottom:14px;">' + t('购物车', 'Cart') + '</h2>' +
      CART.map(function (x, i) {
        return '<div class="card" style="padding:12px 14px;margin-bottom:10px;display:flex;gap:10px;align-items:center;">' +
          '<span class="ck-box" data-i="' + i + '" style="width:20px;height:20px;border-radius:6px;border:2px solid var(--accent);flex-shrink:0;cursor:pointer;background:' + (x.checked !== false ? 'var(--accent)' : 'transparent') + ';"></span>' +
          (x.image ? '<img src="' + escAttr(normImg(x.image)) + '" style="width:56px;height:56px;border-radius:12px;object-fit:cover;">' : '') +
          '<div style="flex:1;min-width:0;"><div style="font-size:16px;">' + esc(x.name) + '</div><div style="font-size:16px;color:var(--accent);">¥' + money(x.price) + '</div></div>' +
          '<button class="qty-btn cart-q" data-i="' + i + '" data-d="-1">−</button><b>' + x.qty + '</b><button class="qty-btn cart-q" data-i="' + i + '" data-d="1">＋</button>' +
          '<button class="buy-btn cart-rm" data-i="' + i + '" style="padding:5px 10px;font-size:14px;background:#fff;color:#d96570;">' + t('删除', 'Remove') + '</button>' +
        '</div>';
      }).join('') +
      '<div class="card" style="padding:14px;display:flex;justify-content:space-between;align-items:center;">' +
        '<span style="font-size:17px;">' + t('已选小计', 'Selected subtotal') + '</span><b style="font-size:20px;color:var(--accent);">¥' + money(sub) + '</b></div>' +
      '<button class="buy-btn" id="cart-go" style="width:100%;margin-top:12px;padding:12px;background:var(--accent);color:#fff;font-size:18px;">' + t('去结算', 'Check out') + '</button>';
    box.querySelectorAll('.ck-box').forEach(function (el) { el.addEventListener('click', function () {
      var x = CART[+el.getAttribute('data-i')]; x.checked = x.checked === false; saveCart(); renderCart();
    }); });
    box.querySelectorAll('.cart-q').forEach(function (el) { el.addEventListener('click', function () {
      var x = CART[+el.getAttribute('data-i')];
      x.qty = Math.max(1, x.qty + parseInt(el.getAttribute('data-d'), 10));
      saveCart(); renderCart();
    }); });
    box.querySelectorAll('.cart-rm').forEach(function (el) { el.addEventListener('click', function () {
      CART.splice(+el.getAttribute('data-i'), 1); saveCart(); renderCart();
    }); });
    document.getElementById('cart-go').addEventListener('click', renderCheckout);
    showView('cart');
  }

  // ===== 列表增强：搜索 / 筛选 / 排序 + 卡片行为 =====
  function enhanceList() {
    var bar = document.createElement('div');
    bar.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:16px;';
    bar.innerHTML =
      '<input id="q-search" placeholder="' + t('搜索商品…', 'Search…') + '" style="flex:1;min-width:150px;padding:10px 14px;font-size:17px;border:none;border-radius:12px;background:#fff;outline:none;color:var(--text);font-family:inherit;box-shadow:0 2px 10px rgba(180,120,150,.08);">' +
      '<div id="q-tags" style="display:flex;gap:6px;flex-wrap:wrap;"></div>' +
      '<button id="q-sort" class="buy-btn" style="padding:8px 14px;background:#fff;">' + t('最新', 'Newest') + '</button>';
    var grid = document.getElementById('product-grid');
    grid.parentNode.insertBefore(bar, grid);
    var SORTS = [['new', t('最新', 'Newest')], ['plow', t('价格从低', 'Price ↑')], ['phigh', t('价格从高', 'Price ↓')]];
    var sortIdx = 0, tag = '', q = '';
    function tags() {
      var set = []; PRODUCTS.forEach(function (p) { if (p.tag && set.indexOf(p.tag) < 0) set.push(p.tag); });
      document.getElementById('q-tags').innerHTML = [''].concat(set).map(function (x) {
        return '<button class="buy-btn q-tag" data-t="' + escAttr(x) + '" style="padding:6px 12px;font-size:14px;border-radius:999px;background:' + (x === tag ? '#ffd9e6;color:#a04a68' : '#fff;color:var(--muted,#9aa5bd)') + ';box-shadow:' + (x === tag ? 'none' : 'inset 0 0 0 1.5px var(--accent-soft,#ffc8d6)') + ';">' + esc(x || t('全部', 'All')) + '</button>';
      }).join('');
      bar.querySelectorAll('.q-tag').forEach(function (b) { b.addEventListener('click', function () { tag = b.getAttribute('data-t'); paint(); }); });
    }
    function paint() {
      var list = PRODUCTS.filter(function (p) {
        if (tag && (p.tag || '') !== tag) return false;
        if (q && ((p.name || '') + (p.description || '')).toLowerCase().indexOf(q.toLowerCase()) < 0) return false;
        return true;
      });
      if (sortIdx === 1) list = list.slice().sort(function (a, b) { return (parseFloat(a.price) || 0) - (parseFloat(b.price) || 0); });
      if (sortIdx === 2) list = list.slice().sort(function (a, b) { return (parseFloat(b.price) || 0) - (parseFloat(a.price) || 0); });
      var onSale = list.filter(function (p) { return statusOfG(p) !== 'out'; });
      var past = list.filter(function (p) { return statusOfG(p) === 'out'; });
      var g = document.getElementById('product-grid');
      g.innerHTML = onSale.length ? onSale.map(productCardShop).join('') : '<p style="grid-column:1/-1;text-align:center;color:var(--muted);">' + t('没有找到相关商品', 'Nothing found') + '</p>';
      bindCards(g);
      var pastSec = document.getElementById('past'), pg = document.getElementById('past-grid');
      if (!past.length) { pastSec.style.display = 'none'; }
      else { pastSec.style.display = ''; pg.innerHTML = past.map(productCardShop).join(''); bindCards(pg); }
    }
    function statusOfG(p) { if (p.display_only) return 'display'; if (p.sold || !(p.stock > 0)) return 'out'; return 'on'; }
    window.__shopPaint = paint;
    document.getElementById('q-search').addEventListener('input', function () { q = this.value; paint(); });
    document.getElementById('q-sort').addEventListener('click', function () {
      sortIdx = (sortIdx + 1) % 3; this.textContent = SORTS[sortIdx][1]; paint();
    });
    tags(); paint();
    // 接管旧脚本的 renderProducts：商品异步加载完成后仍走增强列表
    window.renderProducts = function () { paint(); tags(); };
  }
  // 增强版商品卡：整卡进详情 + 加入购物车 + 保留「找我下单」
  function productCardShop(p) {
    var img = pagerWrapHtml(pagerImgsOf({ images: p.images, image_url: p.image_url }), p.name);
    var st = statusOf(p);
    var stText = st === 'on' ? t('在售', 'On sale') : st === 'display' ? t('仅展示', 'Display only') : t('售尽', 'Sold out');
    var stCls = st === 'on' ? 'st-on' : st === 'display' ? 'st-display' : 'st-out';
    var off = st === 'on' ? '' : ' off';
    return '<div class="product' + off + '" data-pid="' + escAttr(p.id) + '" style="cursor:pointer;">' +
      '<div class="product-img">' + img + '<span class="st ' + stCls + '">' + stText + '</span>' +
      '<button type="button" class="fav-btn' + (isFav(p.id) ? ' on' : '') + '" data-fav="' + escAttr(p.id) + '" aria-label="' + t('收藏', 'Favorite') + '">' + (isFav(p.id) ? '♥' : '♡') + '</button></div>' +
      '<div class="product-info">' +
      '<span class="product-tag">' + esc(p.tag || t('没有标签', 'Untagged')) + '</span>' +
      '<h3>' + esc(p.name) + '</h3>' +
      '<p>' + esc(p.description || '') + '</p>' +
      '<div class="product-row">' +
      '<span class="price">' + (p.price ? '<small>¥</small>' + esc(fmtPriceShop(p.price)) : '') + '</span>' +
      (st === 'on' ? '<button class="buy-btn cart-quick">' + t('加入购物车', 'Add to cart') + '</button>' : '<span class="no-buy">' + (st === 'display' ? t('仅展示，不能下单', 'Not for sale') : '') + '</span>') +
      productEditBtn(p) +
      '</div></div></div>';
  }
  function bindCards(scope) {
    scope.querySelectorAll('.product').forEach(function (card) {
      card.addEventListener('click', function (e) {
        if (e.target.closest('.buy-btn, .card-edit-btn, .pg-btn, .pg-thumb, .fav-btn')) return;
        openDetail(card.getAttribute('data-pid'));
      });
      var quick = card.querySelector('.cart-quick');
      if (quick) quick.addEventListener('click', function () {
        var p = PRODUCTS.filter(function (x) { return String(x.id) === String(card.getAttribute('data-pid')); })[0];
        if (!p) return;
        var vs = variantsOf(p);
        if (vs) { openDetail(p.id); toast(t('先选规格再加入购物车', 'Pick an option first')); return; }
        var img = Array.isArray(p.images) && p.images.length ? p.images[0] : p.image_url;
        cartAdd({ id: p.id, sku: '', name: p.name, image: img, price: parseFloat(p.price) || 0 }, 1);
        toast(t('已加入购物车', 'Added to cart'));
      });
    });
  }

  // ===== 顶部快捷入口 =====
  function paintNav() {
    var bar = document.querySelector('.notice');
    var nav = document.createElement('div');
    nav.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap;margin-bottom:20px;';
    nav.innerHTML =
      '<a class="back-link" href="/shop/?sec=orders">' + t('我的订单', 'Orders') + '</a>' +
      '<a class="back-link" href="/shop/?sec=groups">' + t('拼团', 'Groups') + '</a>';
    bar.parentNode.insertBefore(nav, bar.nextSibling);
  }

  // ===== 路由入口 =====
  function route() {
    loadCart(); paintCartBadge(); bindTopbar(); loadFavs();
    var qs = new URLSearchParams(location.search);
    var id = qs.get('id'), gid = qs.get('gid'), sec = qs.get('sec') || '';
    if (id) return openDetail(id, qs.get('sku'));
    if (gid) return openGroupDetail(gid);
    if (sec === 'cart') return renderCart();
    if (sec === 'checkout') return renderCheckout();
    if (sec === 'orders') return openOrders();
    if (sec === 'groups') return openGroups();
    if (sec === 'account') return renderAccount();
    showView('list');
    if (sec === 'reviews' || sec === 'pay') {
      setTimeout(function () {
        var el = document.getElementById(sec);
        if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.pageYOffset - 74, behavior: 'smooth' });
      }, 300);
    }
  }

  // ===== 启动 =====
  window.__shopDebug = { openDetail: openDetail, openGroupDetail: openGroupDetail, renderAccount: renderAccount, placeOrder: placeOrder, cartAdd: cartAdd }; // 测试钩子
  loadUser();
  loadCart();
  paintNav();
  enhanceList();
  refreshUser().then(function () { UID = null; route(); });
})();
