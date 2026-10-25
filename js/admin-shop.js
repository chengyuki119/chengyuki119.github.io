/* ═══════════════════════════════════════════════════════════════════
   商城管理（买家商城升级 · 后台半边）
   · 全部走 admin.html 现有 api() / authedFetch / toast / uiConfirm / dpOpen / pickPop
   · 未连库（stub 会话 / 离线）时自动回退到可注入的全局假数组：
     SHOP_ORDERS / SHOP_GROUPS / SHOP_GROUP_MEMBERS / SHOP_COUPONS /
     SHOP_PROFILES / SHOP_MSGS / SHOP_PRODUCTS / SHOP_SHIP
   · 渲染函数收拢在 window.ShopAdmin，测试可直接注入假数据后调用
   ═══════════════════════════════════════════════════════════════════ */
(function () {
  var root = document.getElementById('tab-shopmgr');
  if (!root) return;

  /* ── 样式：只作用于本 tab（前缀 sm-），完全复用现有粉色变量与组件 ── */
  var css = document.createElement('style');
  css.textContent = [
    '#tab-shopmgr .sm-stats { display:grid; grid-template-columns:repeat(4,1fr); gap:10px; margin-bottom:14px; }',
    '#tab-shopmgr .sm-stat { background:#fff; border-radius:var(--radius); padding:10px 14px; box-shadow:0 2px 10px rgba(180,120,150,.12); }',
    '#tab-shopmgr .sm-stat b { display:block; font-size:23px; color:var(--text,#5d6780); line-height:1.3; }',
    '#tab-shopmgr .sm-stat span { font-size:14px; color:var(--muted); }',
    '#tab-shopmgr .sm-tabs { display:flex; gap:6px; flex-wrap:wrap; margin-bottom:14px; }',
    '#tab-shopmgr .sm-tab { border:none; background:var(--card); color:var(--muted); font-size:16px; padding:7px 14px; border-radius:999px; cursor:pointer; font-family:inherit; transition:background .15s,color .15s; }',
    '#tab-shopmgr .sm-tab:hover { background:var(--card-hover); }',
    '#tab-shopmgr .sm-tab.active { background:#ffd9e6); color:#fff; }',
    '#tab-shopmgr .sm-toolbar { display:flex; gap:10px; flex-wrap:wrap; align-items:center; margin-bottom:12px; }',
    '#tab-shopmgr .sm-toolbar .dy-chips { flex:1; min-width:260px; }',
    '#tab-shopmgr .sm-toolbar input { width:230px; flex-shrink:0; }',
    '#tab-shopmgr .sm-o-head { display:flex; align-items:center; gap:8px; flex-wrap:wrap; cursor:pointer; }',
    '#tab-shopmgr .sm-o-no { font-weight:700; color:var(--text); }',
    '#tab-shopmgr .sm-o-mail { font-size:15px; color:var(--muted); word-break:break-all; }',
    '#tab-shopmgr .sm-o-total { color:var(--text,#5d6780); font-weight:600; }',
    '#tab-shopmgr .sm-o-time, #tab-shopmgr .sm-o-cnt { font-size:15px; color:var(--muted); }',
    '#tab-shopmgr .sm-o-arrow { margin-left:auto; color:var(--muted); transition:transform .15s; }',
    '#tab-shopmgr .sm-order.open .sm-o-arrow { transform:rotate(90deg); }',
    '#tab-shopmgr .sm-o-body { border-top:1px solid var(--card-hover); margin-top:10px; padding-top:10px; display:flex; flex-direction:column; gap:10px; }',
    '#tab-shopmgr .sm-io-row { display:flex; align-items:center; gap:8px; font-size:16px; }',
    '#tab-shopmgr .sm-io-row img { width:44px; height:44px; border-radius:8px; object-fit:cover; background:var(--card); flex-shrink:0; }',
    '#tab-shopmgr .sm-io-sub { color:var(--muted); font-size:15px; }',
    '#tab-shopmgr .sm-line { font-size:16px; color:var(--text); word-break:break-word; }',
    '#tab-shopmgr .sm-line .lbl { color:var(--muted); font-size:15px; margin-right:6px; }',
    '#tab-shopmgr .sm-pay-img { max-width:220px; max-height:220px; border-radius:10px; border:1px solid var(--card-hover); display:block; background:var(--card); }',
    '#tab-shopmgr .sm-act { display:flex; gap:8px; flex-wrap:wrap; align-items:center; background:var(--card); border-radius:12px; padding:10px; }',
    '#tab-shopmgr .sm-act .lbl { font-size:15px; color:var(--muted); flex-shrink:0; }',
    '#tab-shopmgr .sm-act input, #tab-shopmgr .sm-act textarea { flex:1; min-width:120px; width:auto; }',
    '#tab-shopmgr .sm-act .sm-reject-reason { min-width:190px; }',
    '#tab-shopmgr .sm-act textarea { min-height:44px; }',
    '#tab-shopmgr .sm-total-prev { color:var(--text,#5d6780); font-size:15px; white-space:nowrap; }',
    '#tab-shopmgr .sm-g-top { display:flex; align-items:center; gap:8px; flex-wrap:wrap; }',
    '#tab-shopmgr .sm-g-meta { font-size:15px; color:var(--muted); margin-top:4px; }',
    '#tab-shopmgr .sm-mb-row { font-size:16px; padding:5px 0; border-bottom:1px dashed var(--card-hover); }',
    '#tab-shopmgr .sm-mb-row:last-child { border-bottom:none; }',
    '#tab-shopmgr .sm-c-row { display:flex; align-items:center; gap:8px; flex-wrap:wrap; padding:9px 0; border-bottom:1px solid var(--card-hover); }',
    '#tab-shopmgr .sm-c-row:last-child { border-bottom:none; }',
    '#tab-shopmgr .sm-c-code { font-weight:700; color:var(--text); }',
    '#tab-shopmgr .sm-b-mail { display:flex; justify-content:space-between; gap:10px; flex-wrap:wrap; padding:6px 0; border-bottom:1px dashed var(--card-hover); font-size:16px; }',
    '#tab-shopmgr .sm-b-mail:last-child { border-bottom:none; }',
    '#tab-shopmgr .sm-var-row { display:grid; grid-template-columns: 1fr 1fr 84px 64px auto; gap:6px; align-items:center; margin-bottom:6px; }',
    '#tab-shopmgr .sm-var-row input { padding:7px 10px; font-size:15px; }',
    '#tab-shopmgr .sm-var-imgs { display:flex; gap:6px; flex-wrap:wrap; align-items:center; grid-column:1 / -1; }',
    '#tab-shopmgr .sm-var-imgs img { width:44px; height:44px; border-radius:8px; object-fit:cover; background:var(--card); }',
    '#tab-shopmgr .sm-var-imgdel { position:absolute; top:-6px; right:-6px; width:18px; height:18px; border:none; border-radius:50%; background:var(--accent-soft); color:#fff; font-size:12px; line-height:1; cursor:pointer; }',
    '#tab-shopmgr .sm-empty { text-align:center; color:var(--muted); font-size:17px; padding:24px 0; }',
    '@media (max-width:640px) { #tab-shopmgr .sm-stats { grid-template-columns:repeat(2,1fr); } #tab-shopmgr .sm-var-row { grid-template-columns:1fr 1fr; } }'
  ].join('\n');
  document.head.appendChild(css);

  /* ── 状态 ── */
  var SM = {
    tab: 'orders',
    loaded: false,
    orders: [], groups: [], coupons: [], profiles: [], msgs: [], products: [],
    ship: { service_fee: 2, flat_est: 5 },
    ofilter: '', osearch: '',
    oopen: {},            // order_id -> 行是否展开
    gopen: {},            // group_id -> 成员列表是否展开
    members: {},          // group_id -> 成员数组
    gPid: '', gSku: '',   // 新建拼团：选中的商品 / 规格
    cEdit: null,          // 编辑中的优惠券 id（null = 新建）
    cType: 'percent',     // 优惠券类型（自定义下拉，不用原生 select）
    cAg: false            // 优惠券 allow_group（自定义开关，不用原生 checkbox）
  };

  /* ── 小工具 ── */
  function arr(v) { return Array.isArray(v) ? v : []; }
  function num(v) { var n = parseFloat(v); return isFinite(n) ? n : 0; }
  function byId(list, id) {
    for (var i = 0; i < list.length; i++) if (String(list[i].id) === String(id)) return list[i];
    return null;
  }
  function restGet(path) {
    return api(path).then(function (r) { if (!r.ok) throw new Error('http'); return r.json(); });
  }
  function restWrite(path, method, body, okMsg) {
    return api(path, { method: method, body: JSON.stringify(body) })
      .then(function (r) { if (!r.ok) throw new Error('http'); if (okMsg) toast(okMsg); return true; })
      .catch(function () { toast('保存失败：数据库没连上（本次改动不会落库）'); return false; });
  }
  function addLog(orderId, action, detail) {
    return api('shop_order_logs', { method: 'POST', body: JSON.stringify({ order_id: orderId, actor: 'admin', action: action, detail: detail || '' }) }).catch(function () {});
  }

  var ST = {
    pending:   ['待付款',   '#c4bcb6'],
    reviewing: ['待审核',   '#f3b96d'],
    rejected:  ['凭证有误', '#e6a9c3'],
    paid:      ['待发货',   '#e8a0c8'],
    shipped:   ['已发货',   '#b3ace0'],
    completed: ['已完成',   '#9ecfae'],
    cancelled: ['已取消',   '#c4bcb6'],
    refunding: ['退款处理', '#f3b96d'],
    refunded:  ['已退款',   '#c4bcb6']
  };
  var O_CHIPS = [['', '全部'], ['pending', '待付款'], ['reviewing', '待审核'], ['paid', '待发货'],
                 ['shipped', '已发货'], ['completed', '已完成'], ['rejected', '凭证有误'],
                 ['refunding', '退款中'], ['refunded', '已退款'], ['cancelled', '已取消']];
  var G_ST = { open: ['进行中', '#e8a0c8'], success: ['已成团', '#9ecfae'], failed: ['已失败', '#c4bcb6'], cancelled: ['已取消', '#c4bcb6'] };
  var AS_ST = { open: ['待处理', '#f3b96d'], done: ['已结案', '#9ecfae'], rejected: ['已拒绝', '#c4bcb6'] };

  function badge(st, map) {
    var m = map[st] || [st, '#c4bcb6'];
    return '<span class="sold-badge" style="background:' + m[1] + ';">' + esc(m[0]) + '</span>';
  }

  /* ── 付款凭证：私有桶 pay 路径 → 带签名临时 URL ── */
  var PAY_SIGN = {};
  function signedPay(path) {
    if (!path) return Promise.resolve('');
    var key = String(path).replace(/^\/+/, '');
    if (PAY_SIGN[key]) return Promise.resolve(PAY_SIGN[key]);
    return authedFetch(SUPABASE_URL + '/storage/v1/object/sign/pay/' + key, {
      method: 'POST',
      headers: { 'apikey': SUPABASE_ANON_KEY },
      body: JSON.stringify({ expiresIn: 600 })
    }).then(function (r) { if (!r.ok) throw new Error('sign'); return r.json(); })
      .then(function (d) {
        var u = SUPABASE_URL + '/storage/v1' + (d.signedURL || ('/object/sign/' + (d.signedPath || '')));
        PAY_SIGN[key] = u;
        return u;
      })
      .catch(function () { return ''; });
  }

  /* ── 数据加载（真 API 优先，失败回退可注入假数组）── */
  function loadOrders() {
    return restGet('shop_orders?select=*&order=created_at.desc&limit=300')
      .then(function (rows) { SM.orders = arr(rows); })
      .catch(function () { SM.orders = arr(window.SHOP_ORDERS); })
      .then(function () { renderOrders(); renderStats(); });
  }
  function loadGroups() {
    return restGet('shop_groups?select=*&order=created_at.desc&limit=200')
      .then(function (rows) { SM.groups = arr(rows); })
      .catch(function () { SM.groups = arr(window.SHOP_GROUPS); })
      .then(function () { renderGroups(); renderStats(); });
  }
  function loadCoupons() {
    return restGet('shop_coupons?select=*&order=created_at.desc&limit=200')
      .then(function (rows) { SM.coupons = arr(rows); })
      .catch(function () { SM.coupons = arr(window.SHOP_COUPONS); })
      .then(renderCoupons);
  }
  function loadProfiles() {
    return restGet('shop_profiles?select=id,name,nickname,phone&order=created_at.desc&limit=300')
      .then(function (rows) { SM.profiles = arr(rows); })
      .catch(function () { SM.profiles = arr(window.SHOP_PROFILES); })
      .then(renderBuyers);
  }
  function loadMsgs() {
    return restGet('shop_order_msgs?select=*&type=eq.aftersale&order=created_at.desc&limit=100')
      .then(function (rows) { SM.msgs = arr(rows); })
      .catch(function () { SM.msgs = arr(window.SHOP_MSGS).filter(function (m) { return m.type === 'aftersale'; }); })
      .then(renderAftersale);
  }
  function loadProducts() {
    return restGet('products?select=id,name,price,stock,variants,weight_oz,image_url,tag&order=created_at.desc&limit=200')
      .then(function (rows) { SM.products = arr(rows); })
      .catch(function () { SM.products = arr(window.SHOP_PRODUCTS); });
  }
  function loadShip() {
    var local = null;
    try { local = JSON.parse(SETTINGS['shop_ship'] || 'null'); } catch (e) {}
    if (local && typeof local === 'object') { SM.ship = local; renderSettings(); return Promise.resolve(); }
    return restGet('site_settings?select=key,value&key=eq.shop_ship')
      .then(function (rows) {
        var v = (arr(rows)[0] || {}).value;
        try { v = JSON.parse(v); } catch (e) { v = null; }
        SM.ship = (v && typeof v === 'object') ? v : (window.SHOP_SHIP || { service_fee: 2, flat_est: 5 });
      })
      .catch(function () { SM.ship = window.SHOP_SHIP || { service_fee: 2, flat_est: 5 }; })
      .then(renderSettings);
  }
  function loadAll() {
    return Promise.all([loadOrders(), loadGroups(), loadCoupons(), loadProfiles(), loadMsgs(), loadProducts(), loadShip()])
      .then(function () { SM.loaded = true; });
  }

  /* ── 顶部统计条 ── */
  function renderStats() {
    var box = document.getElementById('sm-stats');
    if (!box) return;
    var reviewing = SM.orders.filter(function (o) { return o.status === 'reviewing'; }).length;
    var paid = SM.orders.filter(function (o) { return o.status === 'paid'; }).length;
    var openG = SM.groups.filter(function (g) { return g.status === 'open'; }).length;
    var confirmed = SM.orders.filter(function (o) { return ['paid', 'shipped', 'completed'].indexOf(o.status) !== -1; })
      .reduce(function (t, o) { return t + num(o.total); }, 0);
    box.innerHTML =
      '<div class="sm-stat"><b data-stat="reviewing">' + reviewing + '</b><span>待审核付款</span></div>' +
      '<div class="sm-stat"><b data-stat="paid">' + paid + '</b><span>待发货</span></div>' +
      '<div class="sm-stat"><b data-stat="groups">' + openG + '</b><span>进行中拼团</span></div>' +
      '<div class="sm-stat"><b data-stat="confirmed">$' + fmtMoney(confirmed) + '</b><span>已确认收款</span></div>';
  }

  /* ═══ 订单管理 ═══ */
  function renderOrderChips() {
    var box = document.getElementById('sm-o-chips');
    if (!box) return;
    box.innerHTML = O_CHIPS.map(function (c) {
      return '<button type="button" class="dy-chip' + (SM.ofilter === c[0] ? ' active' : '') + '" data-f="' + c[0] + '">' + c[1] + '</button>';
    }).join('');
  }
  function filteredOrders() {
    var q = SM.osearch.toLowerCase();
    return SM.orders.filter(function (o) {
      if (SM.ofilter && o.status !== SM.ofilter) return false;
      if (q && String(o.order_no || '').toLowerCase().indexOf(q) === -1 && String(o.email || '').toLowerCase().indexOf(q) === -1) return false;
      return true;
    });
  }
  function itemsHtml(o) {
    return arr(o.items).map(function (it) {
      var img = it.image ? '<img src="' + escAttr(it.image) + '">' : '';
      return '<div class="sm-io-row">' + img +
        '<span>' + esc(it.name || it.sku || '商品') + '</span>' +
        '<span class="sm-io-sub">' + (it.sku ? 'SKU ' + esc(it.sku) + ' · ' : '') + '×' + (it.qty || 1) + ' · $' + fmtMoney(it.price) + '</span>' +
        '</div>';
    }).join('');
  }
  // ── 订单商品编辑（从现有商品中选择，自动重算金额）──
  function ieProdOpts(selName) {
    return '<option value="">选择商品…</option>' + SM.products.map(function (p) {
      return '<option value="' + escAttr(p.id) + '" data-name="' + escAttr(p.name || '') + '" data-price="' + escAttr(p.price != null ? p.price : '') + '"' + (p.name === selName ? ' selected' : '') + '>' + esc((p.name || '（未命名）') + ' · $' + fmtMoney(p.price)) + '</option>';
    }).join('');
  }
  function itemEditRow(it) {
    it = it || {};
    return '<div class="sm-ie-row" style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;background:var(--card,#fff2f7);border-radius:10px;padding:6px 8px;margin-bottom:6px;">' +
      '<select class="sm-ie-prod" style="flex:1;min-width:170px;max-width:280px;border:1.5px solid var(--accent-soft,#ffc8d6);border-radius:10px;padding:6px 8px;font-family:inherit;font-size:14px;background:#fff;color:var(--text,#5d6780);">' + ieProdOpts(it.name) + '</select>' +
      '<label style="font-size:13px;color:var(--muted);">单价 $<input class="sm-ie-price" type="number" step="0.01" min="0" value="' + escAttr(it.price != null ? it.price : '') + '" style="width:74px;border:1.5px solid var(--accent-soft,#ffc8d6);border-radius:8px;padding:4px 6px;font-family:inherit;font-size:14px;"></label>' +
      '<label style="font-size:13px;color:var(--muted);">×<input class="sm-ie-qty" type="number" min="1" step="1" value="' + (it.qty || 1) + '" style="width:52px;border:1.5px solid var(--accent-soft,#ffc8d6);border-radius:8px;padding:4px 6px;font-family:inherit;font-size:14px;"></label>' +
      '<span class="sm-ie-line" style="font-size:14px;min-width:64px;text-align:right;"></span>' +
      '<button type="button" class="btn-del sm-ie-del">删除</button>' +
    '</div>';
  }
  function ieReadRows(card) {
    var rows = [];
    Array.prototype.forEach.call(card.querySelectorAll('.sm-ie-row'), function (r) {
      var sel = r.querySelector('.sm-ie-prod');
      var opt = sel.selectedOptions[0];
      if (!opt || !opt.value) return; // 未选商品的行不算
      rows.push({
        product_id: opt.value,
        name: opt.getAttribute('data-name') || '',
        price: parseFloat(r.querySelector('.sm-ie-price').value) || 0,
        qty: Math.max(1, parseInt(r.querySelector('.sm-ie-qty').value, 10) || 1),
        image: (SM.products.filter(function (p) { return String(p.id) === String(opt.value); })[0] || {}).image || ''
      });
    });
    return rows;
  }
  function iePaintSum(card, o) {
    var items = ieReadRows(card);
    var sub = items.reduce(function (s, it) { return s + it.price * it.qty; }, 0);
    var ship = num(o.shipping_actual != null ? o.shipping_actual : o.shipping_est);
    var total = sub - num(o.discount) + ship + num(o.service_fee);
    var el = card.querySelector('.sm-ie-sum');
    if (el) el.innerHTML = '新小计 $' + fmtMoney(sub) + '（原 $' + fmtMoney(o.subtotal) + '）· 优惠 -$' + fmtMoney(o.discount) + ' · 运费 $' + fmtMoney(ship) + ' · 服务费 $' + fmtMoney(o.service_fee) + ' → 新总价 <b>$' + fmtMoney(total) + '</b>（原 $' + fmtMoney(o.total) + '）';
    return { items: items, sub: sub, total: total };
  }
  function ieRowLine(row) {
    if (!row) return;
    var p = parseFloat(row.querySelector('.sm-ie-price').value) || 0;
    var q = parseInt(row.querySelector('.sm-ie-qty').value, 10) || 1;
    row.querySelector('.sm-ie-line').textContent = '$' + fmtMoney(p * q);
  }
  function addrHtml(a) {
    a = a || {};
    var parts = [a.name, a.phone, a.street, a.city, a.state, a.zip, a.country].filter(function (x) { return x; });
    return parts.length ? esc(parts.join(', ')) : '（无地址）';
  }
  function orderHtml(o) {
    var open = !!SM.oopen[o.id];
    var st = ST[o.status] || [o.status, '#c4bcb6'];
    var ship = num(o.subtotal) - num(o.discount) + num(o.shipping_actual != null ? o.shipping_actual : o.shipping_est) + num(o.service_fee);
    var body = '';
    if (open) {
      body = '<div class="sm-o-body">' +
        '<div style="min-width:0;">' +
          '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:4px;"><b style="font-size:15px;">商品</b>' +
          (o.status !== 'rejected'
            ? '<button type="button" class="btn-mini sm-item-edit">编辑商品</button>'
            : '<span style="font-size:13px;color:var(--muted);">凭证有误订单不可编辑商品</span>') +
          '</div>' +
          '<div class="sm-items-view">' + itemsHtml(o) + '</div>' +
          '<div class="sm-items-edit" style="display:none;"></div>' +
        '</div>' +
        '<div class="sm-line"><span class="lbl">收货</span>' + addrHtml(o.address) + '</div>' +
        (o.note ? '<div class="sm-line"><span class="lbl">买家留言</span>' + esc(o.note) + '</div>' : '') +
        (o.coupon_code ? '<div class="sm-line"><span class="lbl">优惠码</span>' + esc(o.coupon_code) + (num(o.discount) > 0 ? '（已减 $' + fmtMoney(o.discount) + '）' : '') + '</div>' : '') +
        '<div class="sm-line"><span class="lbl">付款</span>' +
        (o.pay_channel ? esc(o.pay_channel) + ' · ' : '') + (o.pay_amount != null && o.pay_amount !== '' ? '$' + fmtMoney(o.pay_amount) + ' · ' : '') +
        (o.pay_time ? esc(o.pay_time) + ' · ' : '') + (o.pay_note ? esc(o.pay_note) : '') +
        (o.status === 'rejected' && o.reject_reason ? '<div class="sm-io-sub">上次拒绝原因：' + esc(o.reject_reason) + '</div>' : '') +
        '</div>' +
        (o.pay_url ? '<img class="sm-pay-img" data-paypath="' + escAttr(o.pay_url) + '" alt="付款凭证">' : '') +
        '<div class="sm-act">' +
        '<button type="button" class="btn-save sm-act-pay">确认付款</button>' +
        '<button type="button" class="btn-del sm-act-reject">拒绝凭证</button>' +
        '<input class="sm-reject-reason" placeholder="拒绝原因（拒绝凭证必填）">' +
        '</div>' +
        '<div class="sm-act"><span class="lbl">实际运费</span>' +
        '<input class="sm-ship-actual" type="number" step="0.01" min="0" placeholder="Pirate Ship 实际运费" value="' + escAttr(o.shipping_actual == null ? '' : o.shipping_actual) + '">' +
        '<span class="sm-total-prev">应付 $' + fmtMoney(ship) + '</span>' +
        '<button type="button" class="btn-mini sm-act-fee">保存运费</button>' +
        '</div>' +
        '<div class="sm-act"><span class="lbl">快递</span>' +
        '<button type="button" class="sel-btn sm-carrier" data-v="' + escAttr(o.carrier || 'UPS') + '"><span class="pick-btn-label">' + esc(o.carrier || 'UPS') + '</span></button>' +
        '<input class="sm-tracking" placeholder="快递单号" value="' + escAttr(o.tracking || '') + '">' +
        '<input class="sm-track-url" placeholder="查件链接（可留空）" value="' + escAttr(o.track_url || '') + '">' +
        '<input class="sm-ship-date" placeholder="发货日期（点选）" value="' + (o.shipped_at ? escAttr(String(o.shipped_at).slice(0, 10).replace(/-/g, '/')) : '') + '">' +
        '<input class="sm-ship-note" placeholder="发货备注（可留空）" value="' + escAttr(o.ship_note || '') + '">' +
        '<button type="button" class="btn-save sm-act-ship">确认发货</button>' +
        '</div>' +
        '<div class="sm-act"><span class="lbl">包裹</span>' +
        '<div class="sm-pkgs" style="width:100%;display:flex;flex-direction:column;gap:6px;"><span style="font-size:14px;color:var(--muted);">加载中…</span></div>' +
        '<button type="button" class="btn-mini sm-pkg-add">＋ 加一个包裹</button>' +
        '</div>' +
        '<div class="sm-act"><span class="lbl">内部备注</span>' +
        '<textarea class="sm-admin-note" placeholder="只有你自己能看到">' + esc(o.admin_note || '') + '</textarea>' +
        '<button type="button" class="btn-mini sm-act-note">保存备注</button>' +
        '</div>' +
        '</div>';
    }
    return '<div class="card sm-order' + (open ? ' open' : '') + '" data-id="' + escAttr(o.id) + '">' +
      '<div class="sm-o-head">' +
      '<span class="sm-o-no">' + esc(o.order_no || '') + '</span>' +
      '<span class="sold-badge" style="background:' + st[1] + ';">' + esc(st[0]) + '</span>' +
      '<span class="sm-o-mail">' + esc(o.email || '') + '</span>' +
      ((o.note || o.coupon_code) ? '<span class="sm-o-cnt" title="' + escAttr((o.note ? '备注：' + o.note : '') + (o.coupon_code ? (o.note ? '；' : '') + '优惠码：' + o.coupon_code : '')) + '">' + (o.note ? '📝' : '') + (o.coupon_code ? '🎟' : '') + '</span>' : '') +
      '<span class="sm-o-cnt">' + arr(o.items).length + ' 件</span>' +
      '<span class="sm-o-total">$' + fmtMoney(o.total) + '</span>' +
      '<span class="sm-o-time">' + fmtTime(o.created_at) + '</span>' +
      '<span class="sm-o-arrow">▸</span>' +
      '</div>' + body + '</div>';
  }
  function renderOrders() {
    renderOrderChips();
    var list = document.getElementById('sm-o-list');
    if (!list) return;
    var rows = filteredOrders();
    list.innerHTML = rows.length ? rows.map(orderHtml).join('') : '<p class="sm-empty">没有符合条件的订单</p>';
    // 已展开的行：补付款凭证签名图 + 包裹列表
    Array.prototype.forEach.call(list.querySelectorAll('img.sm-pay-img[data-paypath]'), function (img) {
      signedPay(img.getAttribute('data-paypath')).then(function (u) { if (u) img.src = u; });
    });
    Array.prototype.forEach.call(list.querySelectorAll('.sm-order.open'), function (card) { loadPkgs(card); });
  }

  // ── 包裹管理（多包裹物流，shop_packages 表）──
  function pkgRowHtml(p) {
    p = p || {};
    return '<div class="sm-pkg-row" data-pkid="' + escAttr(p.id || '') + '" style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;width:100%;background:var(--card,#fff2f7);border-radius:10px;padding:6px 8px;">' +
      '<button type="button" class="sel-btn sm-carrier" data-v="' + escAttr(p.carrier || 'UPS') + '"><span class="pick-btn-label">' + esc(p.carrier || 'UPS') + '</span></button>' +
      '<input class="sm-p-tracking" placeholder="单号" value="' + escAttr(p.tracking || '') + '" style="width:130px;">' +
      '<input class="sm-p-url" placeholder="查件链接" value="' + escAttr(p.track_url || '') + '" style="width:150px;">' +
      '<input class="sm-p-weight" type="number" step="0.1" min="0" placeholder="重量oz" value="' + escAttr(p.weight_oz == null ? '' : p.weight_oz) + '" style="width:80px;">' +
      '<input class="sm-p-date" placeholder="发货日期" value="' + (p.shipped_at ? escAttr(String(p.shipped_at).slice(0, 10).replace(/-/g, '/')) : '') + '" style="width:110px;">' +
      '<input class="sm-p-note" placeholder="备注" value="' + escAttr(p.note || '') + '" style="width:110px;">' +
      '<button type="button" class="btn-mini sm-pkg-save">保存</button>' +
      '<button type="button" class="btn-del sm-pkg-del">删除</button>' +
      '</div>';
  }
  function loadPkgs(card) {
    var o = byId(SM.orders, card.getAttribute('data-id')); if (!o) return;
    var box = card.querySelector('.sm-pkgs'); if (!box) return;
    api('shop_packages?select=*&order_id=eq.' + o.id + '&order=created_at.asc').then(function (r) { return r.json(); }).then(function (rows) {
      rows = arr(rows);
      box.innerHTML = rows.length ? rows.map(pkgRowHtml).join('') : '<span style="font-size:14px;color:var(--muted);">还没有包裹，点「＋ 加一个包裹」</span>';
    }).catch(function () {
      box.innerHTML = '<span style="font-size:14px;color:var(--muted);">包裹数据没连上（跑 SQL2 后可用）</span>';
    });
  }

  function patchOrder(id, body, okMsg, logAction, logDetail) {
    return restWrite('shop_orders?id=eq.' + id, 'PATCH', body, okMsg).then(function (ok) {
      if (!ok) return false;
      var o = byId(SM.orders, id);
      if (o) Object.keys(body).forEach(function (k) { o[k] = body[k]; });
      if (logAction) addLog(id, logAction, logDetail || '');
      renderOrders(); renderStats();
      return true;
    });
  }

  /* ═══ 拼团管理 ═══ */
  function renderGroups() {
    var box = document.getElementById('sm-g-list');
    if (!box) return;
    if (!SM.groups.length) { box.innerHTML = '<p class="sm-empty">还没有拼团</p>'; return; }
    box.innerHTML = SM.groups.map(function (g) {
      var st = G_ST[g.status] || [g.status, '#c4bcb6'];
      var p = byId(SM.products, g.product_id);
      var variant = g.variant_sku ? ' · ' + g.variant_sku : '';
      var members = SM.gopen[g.id] ? '<div class="sm-g-members">' +
        (arr(SM.members[g.id]).length
          ? arr(SM.members[g.id]).map(function (m) {
              return '<div class="sm-mb-row">' + esc(m.nickname || '（未填昵称）') +
                ' · ' + esc(orderNoOf(m.order_id)) + '</div>';
            }).join('')
          : '<p class="sm-empty" style="padding:8px 0;">还没有人参加</p>') + '</div>'
        : '';
      return '<div class="card sm-group" data-gid="' + escAttr(g.id) + '">' +
        '<div class="sm-g-top">' +
        '<b>' + esc(g.name || '（未命名拼团）') + '</b>' + badge(g.status, G_ST) +
        '<span style="flex:1;"></span>' +
        '<button type="button" class="btn-mini sm-g-mb">成员</button>' +
        (g.status === 'open' ? '<button type="button" class="btn-del sm-g-cancel">取消拼团</button>' : '') +
        '</div>' +
        '<div class="sm-g-meta">' + esc((g.product_name || (p ? p.name : '') || '') + variant) +
        ' · 拼团价 $' + fmtMoney(g.price) + ' · ' + (g.joined || 0) + '/' + (g.target || 0) + ' 人 · 截止 ' + fmtTime(g.deadline) + '</div>' +
        members + '</div>';
    }).join('');
  }
  function orderNoOf(orderId) {
    var o = byId(SM.orders, orderId);
    return o && o.order_no ? o.order_no : (orderId ? '订单 ' + String(orderId).slice(0, 8) : '无订单');
  }
  function loadMembers(gid) {
    return api('shop_group_members?select=nickname,order_id&group_id=eq.' + gid)
      .then(function (r) { if (!r.ok) throw new Error('http'); return r.json(); })
      .then(function (rows) { SM.members[gid] = arr(rows); })
      .catch(function () {
        SM.members[gid] = arr(window.SHOP_GROUP_MEMBERS).filter(function (m) { return String(m.group_id) === String(gid); });
      })
      .then(function () { renderGroups(); });
  }

  /* ═══ 优惠券管理 ═══ */
  function couponDesc(c) {
    return c.type === 'percent' ? '减 ' + fmtMoney(c.value) + '%' : '立减 $' + fmtMoney(c.value);
  }
  function renderCoupons() {
    var box = document.getElementById('sm-c-list');
    if (!box) return;
    if (!SM.coupons.length) { box.innerHTML = '<p class="sm-empty">还没有优惠券</p>'; return; }
    box.innerHTML = SM.coupons.map(function (c) {
      return '<div class="sm-c-row" data-cid="' + escAttr(c.id) + '">' +
        '<span class="sm-c-code">' + esc(c.code || '') + '</span>' + badge(c.active ? 'open' : 'cancelled', { open: ['生效中', '#9ecfae'], cancelled: ['已停用', '#c4bcb6'] }) +
        '<span>' + couponDesc(c) + '</span>' +
        '<span class="sm-io-sub">满 $' + fmtMoney(c.min_spend) + ' 可用 · 已用 ' + (c.used || 0) + (num(c.max_uses) > 0 ? '/' + c.max_uses : '') + ' 次 · 每人限 ' + (c.per_user || 0) + ' 次</span>' +
        '<span class="sm-io-sub">' + (c.starts_at ? fmtTime(c.starts_at) + ' 起' : '') + (c.ends_at ? ' ~ ' + fmtTime(c.ends_at) : '') + (c.tag ? ' · 仅「' + esc(c.tag) + '」' : ' · 全场') + (c.allow_group ? ' · 可与拼团同用' : '') + '</span>' +
        '<span style="flex:1;"></span>' +
        '<button type="button" class="btn-mini sm-c-edit">编辑</button>' +
        '<button type="button" class="btn-mini sm-c-toggle">' + (c.active ? '停用' : '启用') + '</button>' +
        '</div>';
    }).join('');
  }
  function couponFormState() {
    return {
      code: document.getElementById('sm-c-code').value.trim(),
      value: document.getElementById('sm-c-value').value.trim(),
      min_spend: document.getElementById('sm-c-min').value.trim(),
      max_uses: document.getElementById('sm-c-max').value.trim(),
      per_user: document.getElementById('sm-c-pu').value.trim(),
      starts_at: document.getElementById('sm-c-start').value.trim(),
      ends_at: document.getElementById('sm-c-end').value.trim(),
      tag: document.getElementById('sm-c-tag').value.trim()
    };
  }
  function fillCouponForm(c) {
    document.getElementById('sm-c-title').textContent = c ? '编辑优惠券 · ' + c.code : '新建优惠券';
    document.getElementById('sm-c-code').value = c ? (c.code || '') : '';
    document.getElementById('sm-c-value').value = c && c.value != null ? c.value : '';
    document.getElementById('sm-c-min').value = c && c.min_spend != null ? c.min_spend : '';
    document.getElementById('sm-c-max').value = c && c.max_uses != null ? c.max_uses : '';
    document.getElementById('sm-c-pu').value = c && c.per_user != null ? c.per_user : 1;
    document.getElementById('sm-c-start').value = c && c.starts_at ? String(c.starts_at).slice(0, 10).replace(/-/g, '/') : '';
    document.getElementById('sm-c-end').value = c && c.ends_at ? String(c.ends_at).slice(0, 10).replace(/-/g, '/') : '';
    document.getElementById('sm-c-tag').value = c ? (c.tag || '') : '';
    SM.cType = c ? (c.type || 'percent') : 'percent';
    document.getElementById('sm-c-type').setAttribute('data-v', SM.cType);
    document.querySelector('#sm-c-type .pick-btn-label').textContent = SM.cType === 'percent' ? '百分比（减%）' : '固定金额（立减$）';
    SM.cAg = c ? !!c.allow_group : false;
    document.getElementById('sm-c-ag').classList.toggle('on', SM.cAg);
    document.getElementById('sm-c-cancel').style.display = c ? '' : 'none';
  }

  /* ═══ 售后 ═══ */
  function renderAftersale() {
    var box = document.getElementById('sm-as-list');
    if (!box) return;
    if (!SM.msgs.length) { box.innerHTML = '<p class="sm-empty">没有售后申请</p>'; return; }
    box.innerHTML = SM.msgs.map(function (m) {
      var o = byId(SM.orders, m.order_id);
      var open = m.status === 'open' || !m.status;
      return '<div class="card sm-as" data-mid="' + escAttr(m.id) + '">' +
        '<div class="sm-g-top">' + badge(open ? 'open' : m.status, AS_ST) +
        '<b>' + esc(o && o.order_no ? o.order_no : orderNoOf(m.order_id)) + '</b>' +
        '<span class="sm-o-time">' + fmtTime(m.created_at) + '</span></div>' +
        '<div class="sm-line" style="margin:6px 0;">' + esc(m.text || '') + '</div>' +
        (open
          ? '<div class="sm-act"><textarea class="sm-as-reply" placeholder="回复买家（会作为商家留言发送）"></textarea>' +
            '<button type="button" class="btn-save sm-as-done">回复并结案</button>' +
            '<button type="button" class="btn-del sm-as-rej">拒绝</button></div>'
          : '') +
        '</div>';
    }).join('');
  }
  function resolveAftersale(mid, status, replyText) {
    var m = byId(SM.msgs, mid);
    if (!m) return;
    var postMsg = function () {
      return api('shop_order_msgs', { method: 'POST', body: JSON.stringify({ order_id: m.order_id, is_admin: true, type: 'msg', text: replyText }) })
        .then(function (r) { if (!r.ok) throw new Error('http'); return true; })
        .catch(function () { toast('回复发送失败：数据库没连上'); return false; });
    };
    (replyText ? postMsg() : Promise.resolve(true)).then(function (ok) {
      if (!ok) return;
      restWrite('shop_order_msgs?id=eq.' + mid, 'PATCH', { status: status }, status === 'done' ? '售后已结案' : '售后已拒绝')
        .then(function (ok2) { if (ok2) { m.status = status; renderAftersale(); } });
    });
  }

  /* ═══ 买家 ═══ */
  function renderBuyers() {
    var mails = document.getElementById('sm-b-mails');
    if (mails) {
      var seen = {}, list = [];
      SM.orders.forEach(function (o) {
        var e = String(o.email || '').trim().toLowerCase();
        if (!e) return;
        if (!seen[e]) { seen[e] = { email: e, count: 0, last: o.created_at }; list.push(seen[e]); }
        seen[e].count++;
        if (o.created_at > seen[e].last) seen[e].last = o.created_at;
      });
      mails.innerHTML = list.length
        ? list.map(function (x) {
            return '<div class="sm-b-mail"><span>' + esc(x.email) + '</span><span class="sm-io-sub">' + x.count + ' 单 · 最近 ' + fmtTime(x.last) + '</span></div>';
          }).join('')
        : '<p class="sm-empty">还没有订单邮箱</p>';
    }
    var pl = document.getElementById('sm-b-list');
    if (pl) {
      pl.innerHTML = SM.profiles.length
        ? SM.profiles.map(function (p) {
            return '<div class="sm-b-mail"><span>' + esc(p.name || '（未填姓名）') + '</span>' +
              '<span>' + esc(p.nickname || '（未填昵称）') + '</span>' +
              '<span class="sm-io-sub">' + esc(p.phone || '（未填电话）') + '</span></div>';
          }).join('')
        : '<p class="sm-empty">还没有买家资料</p>';
    }
  }

  /* ═══ 运费设置 ═══ */
  function renderSettings() {
    var f = document.getElementById('sm-s-fee'), e = document.getElementById('sm-s-flat');
    if (f && document.activeElement !== f) f.value = SM.ship.service_fee != null ? SM.ship.service_fee : 2;
    if (e && document.activeElement !== e) e.value = SM.ship.flat_est != null ? SM.ship.flat_est : 5;
  }

  /* ═══ 商品规格 + 重量（挂进现有商品编辑卡 .edit-grid）═══ */
  function augmentProductEdit(card) {
    var grid = card.querySelector('.edit-grid');
    if (!grid || grid.querySelector('.e-weight')) return;
    var pid = card.getAttribute('data-id');
    var p = byId(SM.products, pid);
    if (!p) {
      // 竞态修复：商品列表还没加载完就点编辑 → 单独拉这个商品，别把已有规格/重量当空（她 2026-10-25 遇到）
      restGet('products?select=id,name,price,stock,variants,weight_oz,image_url,tag&id=eq.' + pid)
        .then(function (rows) {
          var row = arr(rows)[0];
          if (row) SM.products.push(row);
          grid.querySelector('.e-weight') && grid.querySelector('.e-weight').remove();
          var oldBlock = grid.querySelector('.sm-var-block'); if (oldBlock) oldBlock.remove();
          augmentProductEdit(card);
        })
        .catch(function () {});
      return;
    }
    card.__p = p || null;
    card.__variants = JSON.parse(JSON.stringify(p && Array.isArray(p.variants) ? p.variants : []));
    var w = document.createElement('input');
    w.className = 'e-weight';
    w.type = 'number'; w.min = '0'; w.step = '0.1';
    w.value = p && p.weight_oz != null ? p.weight_oz : '';
    w.placeholder = '重量 weight_oz（盎司，含包装）';
    grid.appendChild(w);
    var block = document.createElement('div');
    block.className = 'sm-var-block';
    block.style.gridColumn = '1 / -1';
    block.innerHTML = '<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;flex-wrap:wrap;">' +
      '<b style="font-size:16px;color:var(--text);">商品规格</b>' +
      '<span class="hint" style="flex:1;">多规格商品商城下单必须选规格；留空 = 单规格</span>' +
      '<button type="button" class="btn-mini sm-var-add">＋ 添加规格</button></div>' +
      '<div class="sm-var-rows"></div>' +
      '<p class="hint" style="margin:4px 0 0;">每行：SKU（唯一）/ 规格名 / 价格 / 库存，可传多张图（第一张为封面）</p>';
    grid.appendChild(block);
    smVarRenderRows(card);
  }
  function smVarImgHtml(v, i) {
    return arr(v.images).map(function (u, k) {
      return '<span style="position:relative;display:inline-block;"><img src="' + escAttr(u) + '">' +
        '<button type="button" class="sm-var-imgdel" data-i="' + i + '" data-k="' + k + '" title="删除图片">✕</button></span>';
    }).join('');
  }
  function smVarRenderRows(card) {
    var box = card.querySelector('.sm-var-rows');
    if (!box) return;
    box.innerHTML = arr(card.__variants).map(function (v, i) {
      return '<div class="sm-var-row" data-i="' + i + '">' +
        '<input class="sv-sku" placeholder="SKU" value="' + escAttr(v.sku || '') + '">' +
        '<input class="sv-name" placeholder="规格名" value="' + escAttr(v.name || '') + '">' +
        '<input class="sv-price" type="number" step="0.01" min="0" placeholder="价格" value="' + escAttr(v.price == null ? '' : v.price) + '">' +
        '<input class="sv-stock" type="number" min="0" placeholder="库存" value="' + escAttr(v.stock == null ? '' : v.stock) + '">' +
        '<button type="button" class="btn-del sm-var-del" data-i="' + i + '">删</button>' +
        '<div class="sm-var-imgs">' + smVarImgHtml(v, i) +
        '<label class="btn-mini">＋图<input type="file" class="sm-var-file" data-i="' + i + '" accept="image/*" multiple hidden></label></div>' +
        '</div>';
    }).join('');
  }
  function saveProductExtra(card) {
    var vlist = arr(card.__variants);
    Array.prototype.forEach.call(card.querySelectorAll('.sm-var-row'), function (row) {
      var v = vlist[parseInt(row.getAttribute('data-i'), 10)];
      if (!v) return;
      v.sku = row.querySelector('.sv-sku').value.trim();
      v.name = row.querySelector('.sv-name').value.trim();
      v.price = row.querySelector('.sv-price').value.trim();
      v.stock = row.querySelector('.sv-stock').value.trim();
    });
    var wEl = card.querySelector('.e-weight');
    var body = {};
    if (wEl) body.weight_oz = wEl.value.trim() === '' ? null : parseFloat(wEl.value);
    var clean = vlist.filter(function (v) { return v.sku || v.name; }).map(function (v) {
      return { sku: v.sku || '', name: v.name || '', price: fmtMoney(v.price), stock: parseInt(v.stock, 10) || 0, images: arr(v.images) };
    });
    if (card.__p || clean.length) body.variants = clean;
    if (!Object.keys(body).length) return;
    api('products?id=eq.' + card.getAttribute('data-id'), { method: 'PATCH', body: JSON.stringify(body) })
      .then(function (r) {
        if (!r.ok) throw new Error('http');
        toast('重量/规格已保存');
        if (card.__p) { card.__p.weight_oz = body.weight_oz; card.__p.variants = clean; }
      })
      .catch(function () { toast('重量/规格保存失败'); });
  }

  /* ═══ 构建 DOM ═══ */
  root.innerHTML =
    '<div class="sm-stats" id="sm-stats"></div>' +
    '<div class="sm-tabs" id="sm-tabs">' +
    '<button type="button" class="sm-tab active" data-st="orders">订单</button>' +
    '<button type="button" class="sm-tab" data-st="groups">拼团</button>' +
    '<button type="button" class="sm-tab" data-st="coupons">优惠券</button>' +
    '<button type="button" class="sm-tab" data-st="aftersale">售后</button>' +
    '<button type="button" class="sm-tab" data-st="buyers">买家</button>' +
    '<button type="button" class="sm-tab" data-st="settings">设置</button>' +
    '</div>' +
    '<div id="sm-sec-orders">' +
    '<div class="sm-toolbar"><div class="dy-chips" id="sm-o-chips"></div>' +
    '<input id="sm-o-search" placeholder="搜订单号 / 邮箱" autocomplete="off"></div>' +
    '<div id="sm-o-list"><p class="sm-empty">加载中…</p></div>' +
    '</div>' +
    '<div id="sm-sec-groups" style="display:none;">' +
    '<div class="card"><h3>新建拼团</h3><div class="form-grid">' +
    '<input id="sm-g-name" placeholder="拼团名称 *">' +
    '<button type="button" class="sel-btn" id="sm-g-product" data-v=""><span class="pick-btn-label">选择商品 *</span></button>' +
    '<button type="button" class="sel-btn" id="sm-g-variant" data-v=""><span class="pick-btn-label">规格（可选）</span></button>' +
    '<input id="sm-g-price" type="number" step="0.01" min="0" placeholder="拼团价 *">' +
    '<input id="sm-g-target" type="number" min="2" value="2" placeholder="目标人数">' +
    '<input id="sm-g-deadline" placeholder="截止时间（点选日期）">' +
    '</div><div class="actions"><button type="button" class="btn-save" id="sm-g-save">发起拼团</button></div></div>' +
    '<div id="sm-g-list"><p class="sm-empty">加载中…</p></div>' +
    '</div>' +
    '<div id="sm-sec-coupons" style="display:none;">' +
    '<div class="card"><h3 id="sm-c-title">新建优惠券</h3><div class="form-grid">' +
    '<input id="sm-c-code" placeholder="优惠码 *（唯一，如 WELCOME10）">' +
    '<button type="button" class="sel-btn" id="sm-c-type" data-v="percent"><span class="pick-btn-label">百分比（减%）</span></button>' +
    '<input id="sm-c-value" type="number" step="0.01" min="0" placeholder="优惠值 *（percent: 10 = 减10%）">' +
    '<input id="sm-c-min" type="number" step="0.01" min="0" placeholder="满减门槛 $（0 = 无门槛）">' +
    '<input id="sm-c-max" type="number" min="0" placeholder="总次数上限（0 = 不限）">' +
    '<input id="sm-c-pu" type="number" min="0" placeholder="每人限用次数">' +
    '<input id="sm-c-start" placeholder="开始日期（点选，可留空）">' +
    '<input id="sm-c-end" placeholder="结束日期（点选，可留空）">' +
    '<input id="sm-c-tag" placeholder="仅适用标签商品（留空 = 全场）">' +
    '<div class="fld-inline"><label class="tgl-label"><button type="button" class="tgl" id="sm-c-ag"><span class="tgl-knob"></span></button>可与拼团价同用</label></div>' +
    '</div><div class="actions">' +
    '<button type="button" class="btn-mini" id="sm-c-cancel" style="display:none;">取消编辑</button>' +
    '<button type="button" class="btn-save" id="sm-c-save">保存优惠券</button></div></div>' +
    '<div id="sm-c-list"><p class="sm-empty">加载中…</p></div>' +
    '</div>' +
    '<div id="sm-sec-aftersale" style="display:none;"><div id="sm-as-list"><p class="sm-empty">加载中…</p></div></div>' +
    '<div id="sm-sec-buyers" style="display:none;">' +
    '<div class="card"><h3>最近下单邮箱</h3><div id="sm-b-mails"><p class="sm-empty">加载中…</p></div></div>' +
    '<div class="card"><h3>买家资料</h3><div id="sm-b-list"><p class="sm-empty">加载中…</p></div></div>' +
    '</div>' +
    '<div id="sm-sec-settings" style="display:none;">' +
    '<div class="card"><h3>运费设置</h3><div class="form-grid">' +
    '<div class="fld-inline"><span class="fld-label">服务费 $</span><input id="sm-s-fee" type="number" step="0.01" min="0"></div>' +
    '<div class="fld-inline"><span class="fld-label">运费估算 $</span><input id="sm-s-flat" type="number" step="0.01" min="0"></div>' +
    '</div><p class="hint" style="margin:8px 0 0;">下单应付 = 商品小计 − 优惠 + 运费估算 + 服务费；实际运费发货前在订单里逐单录入。保存后新订单立即生效。</p>' +
    '<div class="actions"><button type="button" class="btn-save" id="sm-s-save">保存设置</button></div></div>' +
    '</div>';

  /* ═══ 事件绑定 ═══ */

  // 一级 tab（商城管理）+ 二级 tab
  document.addEventListener('click', function (e) {
    var b = e.target.closest('.tab-btn');
    if (!b) return;
    var on = b.dataset.tab === 'shopmgr';
    root.style.display = on ? '' : 'none';
    if (on && !SM.loaded) loadAll();
  }, true); // capture：在现有 tab 切换逻辑之外独立控制本容器
  document.getElementById('sm-tabs').addEventListener('click', function (e) {
    var b = e.target.closest('.sm-tab');
    if (!b) return;
    SM.tab = b.getAttribute('data-st');
    Array.prototype.forEach.call(document.querySelectorAll('#sm-tabs .sm-tab'), function (x) {
      x.classList.toggle('active', x === b);
    });
    ['orders', 'groups', 'coupons', 'aftersale', 'buyers', 'settings'].forEach(function (name) {
      document.getElementById('sm-sec-' + name).style.display = SM.tab === name ? '' : 'none';
    });
  });

  // ── 订单 ──
  document.getElementById('sm-o-chips').addEventListener('click', function (e) {
    var b = e.target.closest('.dy-chip');
    if (!b) return;
    SM.ofilter = b.getAttribute('data-f') || '';
    renderOrders();
  });
  document.getElementById('sm-o-search').addEventListener('input', function () {
    SM.osearch = this.value.trim().toLowerCase();
    renderOrders();
  });
  var oList = document.getElementById('sm-o-list');
  oList.addEventListener('click', function (e) {
    var card = e.target.closest('.sm-order');
    if (!card) return;
    var id = card.getAttribute('data-id');
    var o = byId(SM.orders, id);
    if (!o) return;

    // 后台保存类按钮：防重复提交（成功后 renderOrders 重绘节点自动恢复，4s 兕底）
    var tBtn = e.target.closest('button');
    if (tBtn && (tBtn.classList.contains('btn-save') || tBtn.classList.contains('btn-mini') || tBtn.classList.contains('btn-del')) && !tBtn.dataset.busy) {
      tBtn.dataset.busy = '1'; tBtn.disabled = true;
      setTimeout(function () { if (tBtn.isConnected) { tBtn.dataset.busy = ''; tBtn.disabled = false; } }, 4000);
    }

    // 展开 / 收起（点头部；点操作区不收起）
    if (e.target.closest('.sm-o-head')) {
      SM.oopen[id] = !SM.oopen[id];
      renderOrders();
      return;
    }
    if (e.target.classList.contains('sm-carrier')) { // 快递公司：站内自定义下拉
      pickPop(e.target, [{ v: 'UPS', label: 'UPS' }, { v: 'USPS', label: 'USPS' }, { v: 'FedEx', label: 'FedEx' }, { v: 'Other', label: 'Other' }],
        e.target.getAttribute('data-v') || 'UPS', function (v) {
          e.target.setAttribute('data-v', v);
          e.target.querySelector('.pick-btn-label').textContent = v;
        });
      return;
    }
    if (e.target.classList.contains('sm-act-pay')) { // 确认付款
      uiConfirm('确认订单 ' + (o.order_no || '') + ' 的付款凭证没问题吗？确认后进入待发货。', function () {
        patchOrder(id, { status: 'paid', reject_reason: '' }, '已确认付款，记得尽快发货', 'status', '审核凭证通过 → paid');
      }, '确认付款');
      return;
    }
    if (e.target.classList.contains('sm-act-reject')) { // 拒绝凭证（原因必填）
      var reason = card.querySelector('.sm-reject-reason').value.trim();
      if (!reason) { toast('拒绝凭证要写原因哦（必填）'); return; }
      patchOrder(id, { status: 'rejected', reject_reason: reason }, '已拒绝，买家可重传凭证', 'status', '凭证有误 → rejected：' + reason);
      return;
    }
    if (e.target.classList.contains('sm-act-fee')) { // 录入实际运费（total 一起重算）
      var inp = card.querySelector('.sm-ship-actual');
      var v = parseFloat(inp.value);
      if (!isFinite(v) || v < 0) { toast('运费要填一个不小于 0 的数字'); return; }
      var total = num(o.subtotal) - num(o.discount) + v + num(o.service_fee);
      patchOrder(id, { shipping_actual: fmtMoney(v), total: fmtMoney(total) },
        '运费已录入，应付改为 $' + fmtMoney(total), 'fee', '实际运费 $' + fmtMoney(v));
      return;
    }
    if (e.target.classList.contains('sm-act-ship')) { // 确认发货
      var carrier = card.querySelector('.sm-carrier').getAttribute('data-v') || 'UPS';
      var shipDate = card.querySelector('.sm-ship-date').value.trim();
      var body = {
        carrier: carrier,
        tracking: card.querySelector('.sm-tracking').value.trim(),
        track_url: card.querySelector('.sm-track-url').value.trim(),
        ship_note: card.querySelector('.sm-ship-note').value.trim(),
        shipped_at: shipDate ? dpToInternal(shipDate) + 'T12:00:00Z' : new Date().toISOString(),
        status: 'shipped'
      };
      uiConfirm('确认 ' + (o.order_no || '') + ' 已交给 ' + carrier + ' 发出？', function () {
        patchOrder(id, body, '已发货，买家会看到物流信息', 'status', '确认发货 → shipped（' + carrier + ' ' + body.tracking + '）');
      }, '确认发货');
      return;
    }
    if (e.target.classList.contains('sm-pkg-add')) { // 包裹：新增一行
      var pkBox = card.querySelector('.sm-pkgs');
      if (pkBox) {
        var ph = pkBox.querySelector('span');
        if (ph && ph.textContent.indexOf('还没有') !== -1) ph.remove();
        pkBox.insertAdjacentHTML('beforeend', pkgRowHtml({}));
      }
      return;
    }
    if (e.target.classList.contains('sm-pkg-save')) { // 包裹：保存
      var prow = e.target.closest('.sm-pkg-row');
      var po = byId(SM.orders, card.getAttribute('data-id')); if (!po || !prow) return;
      var pdate = prow.querySelector('.sm-p-date').value.trim();
      var pbody = {
        order_id: po.id,
        carrier: prow.querySelector('.sm-carrier').getAttribute('data-v') || 'UPS',
        tracking: prow.querySelector('.sm-p-tracking').value.trim(),
        track_url: prow.querySelector('.sm-p-url').value.trim(),
        weight_oz: parseFloat(prow.querySelector('.sm-p-weight').value) || null,
        shipped_at: pdate ? dpToInternal(pdate) + 'T12:00:00Z' : null,
        note: prow.querySelector('.sm-p-note').value.trim()
      };
      var pkid = prow.getAttribute('data-pkid');
      var preq = pkid
        ? api('shop_packages?id=eq.' + pkid, { method: 'PATCH', body: JSON.stringify(pbody) })
        : api('shop_packages', { method: 'POST', body: JSON.stringify(pbody) });
      preq.then(function (r) {
        toast(r.ok ? '包裹已保存' : '保存失败（需要跑 SQL2）');
        if (r.ok) loadPkgs(card);
      }).catch(function () { toast('保存失败（需要跑 SQL2）'); });
      return;
    }
    if (e.target.classList.contains('sm-pkg-del')) { // 包裹：删除
      var drow = e.target.closest('.sm-pkg-row');
      var did = drow ? drow.getAttribute('data-pkid') : '';
      if (!did) { drow.remove(); return; }
      uiConfirm('删除这个包裹的物流信息？', function () {
        api('shop_packages?id=eq.' + did, { method: 'DELETE' }).then(function (r) {
          toast(r.ok ? '已删除' : '删除失败');
          if (r.ok) loadPkgs(card);
        });
      });
      return;
    }
    if (e.target.classList.contains('sm-item-edit')) { // 订单商品：进入编辑模式
      var ieBox = card.querySelector('.sm-items-edit');
      if (!ieBox) return;
      ieBox.innerHTML = arr(o.items).map(itemEditRow).join('') +
        '<button type="button" class="btn-mini sm-ie-add">＋ 加商品</button>' +
        '<div class="sm-ie-sum" style="margin:8px 0;font-size:14px;"></div>' +
        '<div style="display:flex;gap:8px;"><button type="button" class="btn-save sm-ie-save">保存商品变更</button>' +
        '<button type="button" class="btn-mini sm-ie-cancel">取消</button></div>';
      ieBox.style.display = '';
      card.querySelector('.sm-items-view').style.display = 'none';
      Array.prototype.forEach.call(ieBox.querySelectorAll('.sm-ie-row'), ieRowLine);
      iePaintSum(card, o);
      return;
    }
    if (e.target.classList.contains('sm-ie-add')) { // 加一行商品
      var addBtn = card.querySelector('.sm-ie-add');
      if (addBtn) addBtn.insertAdjacentHTML('beforebegin', itemEditRow({}));
      return;
    }
    if (e.target.classList.contains('sm-ie-cancel')) { // 取消编辑：回到展示，不写库
      card.querySelector('.sm-items-edit').style.display = 'none';
      card.querySelector('.sm-items-view').style.display = '';
      return;
    }
    if (e.target.classList.contains('sm-ie-del')) {
      e.target.closest('.sm-ie-row').remove();
      iePaintSum(card, o);
      return;
    }
    if (e.target.classList.contains('sm-ie-save')) { // 保存：确认变更 → PATCH 重算金额
      var calc = iePaintSum(card, o);
      if (!calc.items.length) { toast('至少保留一件商品（选好商品再保存）'); return; }
      var paidWarn = (['paid', 'shipped', 'completed'].indexOf(o.status) !== -1 && o.pay_amount != null && o.pay_amount !== '')
        ? '\n\n注意：该订单已付款 $' + fmtMoney(o.pay_amount) + '，付款记录不会自动修改；金额有变请走退款/补款流程确认。' : '';
      uiConfirm('确认保存商品变更？\n\n' + (o.order_no || '') + '\n小计 $' + fmtMoney(o.subtotal) + ' → $' + fmtMoney(calc.sub) + '\n总价 $' + fmtMoney(o.total) + ' → $' + fmtMoney(calc.total) + paidWarn, function () {
        patchOrder(id, { items: calc.items, subtotal: fmtMoney(calc.sub), total: fmtMoney(calc.total) },
          '商品已更新，金额已重算', 'edit_items',
          '商品编辑：' + calc.items.length + ' 件，小计 $' + fmtMoney(o.subtotal) + '→$' + fmtMoney(calc.sub) + '，总价 $' + fmtMoney(o.total) + '→$' + fmtMoney(calc.total));
        // 成功后 patchOrder→renderOrders 重绘回展示态；失败则保留编辑框内容
      }, '保存');
      return;
    }
    if (e.target.classList.contains('sm-act-note')) { // 内部备注
      patchOrder(id, { admin_note: card.querySelector('.sm-admin-note').value }, '内部备注已保存');
      return;
    }
  });
  oList.addEventListener('input', function (e) {
    var card = e.target.closest('.sm-order');
    if (!card) return;
    var o = byId(SM.orders, card.getAttribute('data-id'));
    if (e.target.classList.contains('sm-ie-price') || e.target.classList.contains('sm-ie-qty')) { // 商品编辑：行小计+汇总实时重算
      if (!o) return;
      ieRowLine(e.target.closest('.sm-ie-row'));
      iePaintSum(card, o);
      return;
    }
    if (!e.target.classList.contains('sm-ship-actual')) return;
    if (!o) return;
    var v = parseFloat(e.target.value);
    var ship = num(o.subtotal) - num(o.discount) + (isFinite(v) ? v : num(o.shipping_est)) + num(o.service_fee);
    card.querySelector('.sm-total-prev').textContent = '应付 $' + fmtMoney(ship);
  });
  oList.addEventListener('change', function (e) { // 商品选择：带入现有商品单价
    if (!e.target.classList.contains('sm-ie-prod')) return;
    var card = e.target.closest('.sm-order');
    var row = e.target.closest('.sm-ie-row');
    var opt = e.target.selectedOptions[0];
    if (opt && opt.value) {
      var dp = opt.getAttribute('data-price');
      if (dp !== null && dp !== '') row.querySelector('.sm-ie-price').value = dp;
    }
    ieRowLine(row);
    var o = byId(SM.orders, card.getAttribute('data-id'));
    if (o) iePaintSum(card, o);
  });
  oList.addEventListener('click', function (e) { // 发货日期：复用现有 dp 日期选择器
    if (!e.target.classList.contains('sm-ship-date') && !e.target.classList.contains('sm-p-date')) return;
    dpOpen(e.target);
  });

  // ── 拼团 ──
  document.getElementById('sm-g-product').addEventListener('click', function () {
    var btn = this;
    if (!SM.products.length) { toast('商品还没加载好'); return; }
    pickPop(btn, SM.products.map(function (p) { return { v: p.id, label: p.name }; }), SM.gPid, function (v) {
      SM.gPid = v; SM.gSku = '';
      var p = byId(SM.products, v);
      btn.setAttribute('data-v', v);
      btn.querySelector('.pick-btn-label').textContent = p ? p.name : '选择商品 *';
      var vb = document.getElementById('sm-g-variant');
      vb.setAttribute('data-v', '');
      vb.querySelector('.pick-btn-label').textContent = '规格（可选）';
    });
  });
  document.getElementById('sm-g-variant').addEventListener('click', function () {
    var btn = this;
    var p = byId(SM.products, SM.gPid);
    if (!p) { toast('先选商品'); return; }
    var vs = arr(p.variants);
    if (!vs.length) { toast('这个商品是单规格，不用选'); return; }
    pickPop(btn, [{ v: '', label: '无规格（整件）' }].concat(vs.map(function (v) {
      return { v: v.sku || '', label: (v.name || v.sku) + ' · $' + fmtMoney(v.price) };
    })), SM.gSku, function (v) {
      SM.gSku = v;
      btn.setAttribute('data-v', v);
      btn.querySelector('.pick-btn-label').textContent = v ? v : '规格（可选）';
    });
  });
  document.getElementById('sm-g-deadline').addEventListener('click', function () { dpOpen(this); });
  document.getElementById('sm-g-save').addEventListener('click', function () {
    var name = document.getElementById('sm-g-name').value.trim();
    var p = byId(SM.products, SM.gPid);
    var price = parseFloat(document.getElementById('sm-g-price').value);
    var target = parseInt(document.getElementById('sm-g-target').value, 10) || 2;
    var deadline = dpToInternal(document.getElementById('sm-g-deadline').value);
    if (!name) { toast('先给拼团起个名字'); return; }
    if (!p) { toast('选一个商品'); return; }
    if (!isFinite(price) || price < 0) { toast('拼团价要填一个数字'); return; }
    if (target < 2) { toast('目标人数至少 2 人'); return; }
    if (!deadline) { toast('选一下截止时间'); return; }
    this.disabled = true;
    api('shop_groups', {
      method: 'POST',
      body: JSON.stringify({
        product_id: p.id, variant_sku: SM.gSku, name: name,
        product_name: p.name, product_image: p.image_url || '',
        price: fmtMoney(price), target: target,
        deadline: deadline + 'T23:59:59Z', status: 'open'
      })
    }).then(function (r) {
      if (!r.ok) throw new Error('http');
      toast('拼团已发起，前台能看到啦');
      document.getElementById('sm-g-name').value = '';
      document.getElementById('sm-g-price').value = '';
      SM.gPid = ''; SM.gSku = '';
      document.getElementById('sm-g-product').setAttribute('data-v', '');
      document.querySelector('#sm-g-product .pick-btn-label').textContent = '选择商品 *';
      document.getElementById('sm-g-variant').setAttribute('data-v', '');
      document.querySelector('#sm-g-variant .pick-btn-label').textContent = '规格（可选）';
      document.getElementById('sm-g-deadline').value = '';
      loadGroups();
    }).catch(function () { toast('发起失败：数据库没连上'); })
      .finally(function () { this.disabled = false; }.bind(document.getElementById('sm-g-save')));
  });
  document.getElementById('sm-g-list').addEventListener('click', function (e) {
    var card = e.target.closest('.sm-group');
    if (!card) return;
    var gid = card.getAttribute('data-gid');
    if (e.target.classList.contains('sm-g-mb')) {
      SM.gopen[gid] = !SM.gopen[gid];
      if (SM.gopen[gid]) loadMembers(gid); else renderGroups();
      return;
    }
    if (e.target.classList.contains('sm-g-cancel')) {
      var g = byId(SM.groups, gid);
      uiConfirm('确定取消拼团「' + ((g && g.name) || '') + '」吗？已参加的买家订单不受影响，但团不会再成。', function () {
        restWrite('shop_groups?id=eq.' + gid, 'PATCH', { status: 'cancelled' }, '拼团已取消')
          .then(function (ok) { if (ok) { var gg = byId(SM.groups, gid); if (gg) gg.status = 'cancelled'; renderGroups(); renderStats(); } });
      }, '取消拼团');
    }
  });

  // ── 优惠券 ──
  document.getElementById('sm-c-type').addEventListener('click', function () {
    var btn = this;
    pickPop(btn, [{ v: 'percent', label: '百分比（减%）' }, { v: 'fixed', label: '固定金额（立减$）' }], SM.cType, function (v) {
      SM.cType = v;
      btn.setAttribute('data-v', v);
      btn.querySelector('.pick-btn-label').textContent = v === 'percent' ? '百分比（减%）' : '固定金额（立减$）';
    });
  });
  document.getElementById('sm-c-ag').addEventListener('click', function () {
    SM.cAg = !SM.cAg;
    this.classList.toggle('on', SM.cAg);
  });
  document.getElementById('sm-c-start').addEventListener('click', function () { dpOpen(this); });
  document.getElementById('sm-c-end').addEventListener('click', function () { dpOpen(this); });
  document.getElementById('sm-c-cancel').addEventListener('click', function () { SM.cEdit = null; fillCouponForm(null); });
  document.getElementById('sm-c-save').addEventListener('click', function () {
    var f = couponFormState();
    if (!f.code) { toast('优惠码总要有的'); return; }
    if (f.value === '' || !isFinite(parseFloat(f.value))) { toast('优惠值要填一个数字'); return; }
    var body = {
      code: f.code,
      type: SM.cType,
      value: fmtMoney(f.value),
      min_spend: fmtMoney(f.min_spend || 0),
      max_uses: parseInt(f.max_uses, 10) || 0,
      per_user: parseInt(f.per_user, 10) || 0,
      starts_at: f.starts_at ? dpToInternal(f.starts_at) + 'T00:00:00Z' : null,
      ends_at: f.ends_at ? dpToInternal(f.ends_at) + 'T23:59:59Z' : null,
      tag: f.tag,
      allow_group: SM.cAg
    };
    var btn = this;
    btn.disabled = true;
    var req = SM.cEdit
      ? restWrite('shop_coupons?id=eq.' + SM.cEdit, 'PATCH', body, '优惠券已更新')
      : api('shop_coupons', { method: 'POST', body: JSON.stringify(body) })
          .then(function (r) { if (!r.ok) throw new Error('http'); toast('优惠券已创建'); return true; })
          .catch(function () { toast('创建失败：码可能重复，或数据库没连上'); return false; });
    Promise.resolve(req).then(function (ok) {
      btn.disabled = false;
      if (!ok) return;
      SM.cEdit = null;
      fillCouponForm(null);
      loadCoupons();
    });
  });
  document.getElementById('sm-c-list').addEventListener('click', function (e) {
    var row = e.target.closest('.sm-c-row');
    if (!row) return;
    var c = byId(SM.coupons, row.getAttribute('data-cid'));
    if (!c) return;
    if (e.target.classList.contains('sm-c-edit')) {
      SM.cEdit = c.id;
      fillCouponForm(c);
      document.getElementById('sm-sec-coupons').scrollIntoView({ block: 'start' });
      return;
    }
    if (e.target.classList.contains('sm-c-toggle')) {
      restWrite('shop_coupons?id=eq.' + c.id, 'PATCH', { active: !c.active }, c.active ? '已停用' : '已启用')
        .then(function (ok) { if (ok) { c.active = !c.active; renderCoupons(); } });
    }
  });

  // ── 售后 ──
  document.getElementById('sm-as-list').addEventListener('click', function (e) {
    var card = e.target.closest('.sm-as');
    if (!card) return;
    var mid = card.getAttribute('data-mid');
    if (e.target.classList.contains('sm-as-done')) {
      resolveAftersale(mid, 'done', card.querySelector('.sm-as-reply').value.trim());
      return;
    }
    if (e.target.classList.contains('sm-as-rej')) {
      resolveAftersale(mid, 'rejected', card.querySelector('.sm-as-reply').value.trim());
    }
  });

  // ── 设置 ──
  document.getElementById('sm-s-save').addEventListener('click', function () {
    var fee = parseFloat(document.getElementById('sm-s-fee').value);
    var est = parseFloat(document.getElementById('sm-s-flat').value);
    if (!isFinite(fee) || fee < 0 || !isFinite(est) || est < 0) { toast('服务费和运费都要填不小于 0 的数字'); return; }
    var val = { service_fee: fmtMoney(fee), flat_est: fmtMoney(est) };
    saveSetting('shop_ship', val).then(function (r) {
      if (!r.ok) throw new Error('http');
      SETTINGS['shop_ship'] = JSON.stringify(val);
      SM.ship = val;
      toast('运费设置已保存，新订单立即生效');
    }).catch(function () { toast('保存失败：数据库没连上'); });
  });

  // ── 商品编辑卡：追加 重量 + 规格编辑器（不动现有 .edit-grid 逻辑）──
  // 注意：现有 kebab 处理器会同步替换 card.innerHTML，气泡阶段轮到我时 e.target 已脱禹 DOM，
  // 所以用捕获阶段接管：kebab 延迟一拍等卡片重建完再追加；保存则在现有处理器读值前先读走重量/规格。
  var productList = document.getElementById('product-list');
  if (productList) {
    productList.addEventListener('click', function (e) {
      var t = e.target;
      var isKebab = t.classList && t.classList.contains('kebab');
      var isSave = t.classList && t.classList.contains('btn-save-edit');
      if (!isKebab && !isSave) return;
      var card = t.closest('.shop-item');
      if (!card) return;
      if (isKebab) setTimeout(function () { augmentProductEdit(card); }, 0);
      else saveProductExtra(card);
    }, true);
    productList.addEventListener('input', function (e) {
      var row = e.target.closest('.sm-var-row');
      if (!row) return;
      var card = e.target.closest('.shop-item');
      var v = arr(card.__variants)[parseInt(row.getAttribute('data-i'), 10)];
      if (!v) return;
      if (e.target.classList.contains('sv-sku')) v.sku = e.target.value;
      if (e.target.classList.contains('sv-name')) v.name = e.target.value;
      if (e.target.classList.contains('sv-price')) v.price = e.target.value;
      if (e.target.classList.contains('sv-stock')) v.stock = e.target.value;
    });
    productList.addEventListener('click', function (e) { // 规格行：添加 / 删行 / 删图（与保存按钮同一监听器分开写，逻辑清楚）
      var card = e.target.closest('.shop-item');
      if (!card) return;
      if (e.target.classList.contains('sm-var-add')) {
        card.__variants = arr(card.__variants);
        card.__variants.push({ sku: '', name: '', price: '', stock: '', images: [] });
        smVarRenderRows(card);
        return;
      }
      if (e.target.classList.contains('sm-var-del')) {
        card.__variants.splice(parseInt(e.target.getAttribute('data-i'), 10), 1);
        smVarRenderRows(card);
        return;
      }
      var imgdel = e.target.closest('.sm-var-imgdel');
      if (imgdel) {
        var v = arr(card.__variants)[parseInt(imgdel.getAttribute('data-i'), 10)];
        if (v && arr(v.images)) { v.images.splice(parseInt(imgdel.getAttribute('data-k'), 10), 1); smVarRenderRows(card); }
      }
    });
    productList.addEventListener('change', function (e) { // 规格图上传：复用 uploadShopFiles（shop 桶）
      if (!e.target.classList.contains('sm-var-file')) return;
      var card = e.target.closest('.shop-item');
      var i = parseInt(e.target.getAttribute('data-i'), 10);
      var v = arr(card.__variants)[i];
      var files = Array.prototype.slice.call(e.target.files || []);
      if (!v || !files.length) return;
      uploadShopFiles(files).then(function (urls) {
        v.images = arr(v.images).concat(urls);
        smVarRenderRows(card);
        toast('规格图已上传，点「保存修改」落库');
      }).catch(function () { toast('图片上传失败'); });
    });
  }

  /* ── 首次打开加载 + #shopmgr 直达 ── */
  if (location.hash.replace('#', '') === 'shopmgr') {
    var tb = document.querySelector('.tab-btn[data-tab="shopmgr"]');
    if (tb) tb.click();
  }

  /* ── 暴露给测试：注入假数组后直接调渲染函数 ── */
  window.ShopAdmin = {
    sm: SM,
    loadAll: loadAll,
    loadOrders: loadOrders,
    loadGroups: loadGroups,
    loadCoupons: loadCoupons,
    loadProfiles: loadProfiles,
    loadMsgs: loadMsgs,
    loadProducts: loadProducts,
    loadShip: loadShip,
    renderStats: renderStats,
    renderOrders: renderOrders,
    renderGroups: renderGroups,
    renderCoupons: renderCoupons,
    renderAftersale: renderAftersale,
    renderBuyers: renderBuyers,
    renderSettings: renderSettings
  };
})();
