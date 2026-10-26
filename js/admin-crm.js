/* ══════════════════════════════════════════════════════════════════
   admin-crm.js —— 客户管理 / 线下开单 / 邮件与联系人同步（她 2026-10-26 阶段2）
   依赖 admin.html 全局：api() / esc() / escAttr() / toast() / uiConfirm() / fmtMoney()
   数据：shop_customers + shop_orders(order_source pos) + RPC shop_customer_save/merge/shop_pos_create/shop_pos_confirm
   ══════════════════════════════════════════════════════════════════ */
(function () {
  var SUPA = (window.SUPABASE_URL || (window.SUPABASE_URL = 'https://zajcglvlzsolygvjeumb.supabase.co'));
  var CRM = window.CRM = {};
  function t(zh, en) { return (window.LANG === 'en') ? en : zh; }

  /* ═══════════ 客户管理 ═══════════ */
  var CUST = { list: [], search: '', filter: '' };

  CRM.bootCrm = function () {
    var panel = document.getElementById('tab-crm');
    if (panel.dataset.booted) { renderCrm(); return; }
    panel.dataset.booted = '1';
    renderCrm();
    loadCust();
  };

  function renderCrm() {
    var panel = document.getElementById('tab-crm');
    panel.innerHTML =
      '<div class="card" style="padding:16px 20px;margin-bottom:14px;">' +
        '<div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap;">' +
          '<input id="cust-q" placeholder="' + t('搜索姓名 / 邮箱 / 电话 / 客户编号', 'Search name / email / phone / no.') + '" style="flex:1;min-width:220px;padding:10px 16px;font-size:15px;border:1.5px solid var(--accent-soft,#FCE4EC);border-radius:12px;outline:none;font-family:inherit;color:var(--text,#604C57);background:#fff;box-sizing:border-box;">' +
          '<button class="btn-save-tb" id="cust-new">＋ ' + t('新建客户', 'New customer') + '</button>' +
        '</div>' +
        '<div id="cust-stats" style="display:flex;gap:10px;flex-wrap:wrap;margin-top:12px;"></div>' +
      '</div>' +
      '<div id="cust-list"><p style="color:var(--muted,#A88E9B);text-align:center;padding:24px 0;">' + t('加载中…', 'Loading…') + '</p></div>';
    panel.querySelector('#cust-q').addEventListener('input', function () { CUST.search = this.value.trim().toLowerCase(); renderCustRows(); });
    panel.querySelector('#cust-new').addEventListener('click', function () { custForm(null); });
  }

  function loadCust() {
    api('shop_customers?select=*&order=created_at.desc').then(function (r) { return r.json(); }).then(function (rows) {
      CUST.list = rows || [];
      api('shop_orders?select=customer_id,user_id,status,total,order_no,order_source,email&order=created_at.desc&limit=500').then(function (r2) { return r2.json(); }).then(function (ords) {
        CUST.orders = ords || [];
        renderCustRows();
      });
    }).catch(function () { toast('客户列表加载失败'); });
  }

  // 消费统计：已付款（paid/shipped/completed/refunding）计入；refunded 全额退不计；测试/待付款/取消不计
  function custStats(c) {
    var ords = (CUST.orders || []).filter(function (o) {
      return (o.customer_id && o.customer_id === c.id) || (c.user_id && o.user_id === c.user_id);
    });
    var paid = ords.filter(function (o) { return ['paid', 'shipped', 'completed', 'refunding'].indexOf(o.status) >= 0; });
    var sum = 0; paid.forEach(function (o) { sum += Number(o.total) || 0; });
    var last = paid.length ? paid[0] : null;
    return { count: paid.length, sum: sum, last: last, ords: ords };
  }

  function renderCustRows() {
    var box = document.getElementById('cust-list');
    var rows = CUST.list.filter(function (c) {
      if (!CUST.search) return true;
      return [c.name, c.email, c.phone, c.c_no].some(function (v) { return String(v || '').toLowerCase().indexOf(CUST.search) >= 0; });
    });
    var vipN = CUST.list.filter(function (c) { return c.vip; }).length;
    var totalSum = 0; CUST.list.forEach(function (c) { totalSum += custStats(c).sum; });
    var stats = document.getElementById('cust-stats');
    if (stats) stats.innerHTML =
      '<span class="sm-stat"><b>' + CUST.list.length + '</b><span>' + t('客户总数', 'Customers') + '</span></span>' +
      '<span class="sm-stat"><b style="color:#ff6fa5;">$' + fmtMoney(totalSum) + '</b><span>' + t('累计消费（已扣退款）', 'Total spent') + '</span></span>' +
      '<span class="sm-stat"><b>' + vipN + '</b><span>' + t('VIP 会员', 'VIP') + '</span></span>';
    if (!rows.length) { box.innerHTML = '<p style="color:var(--muted,#A88E9B);text-align:center;padding:24px 0;">' + t('还没有客户档案', 'No customers yet') + '</p>'; return; }
    box.innerHTML = rows.map(function (c) {
      var st = custStats(c);
      return '<div class="card cust-row" data-cid="' + escAttr(c.id) + '" style="padding:12px 16px;margin-bottom:10px;cursor:pointer;">' +
        '<div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;">' +
          '<span style="font-size:16px;font-weight:700;color:var(--text,#604C57);">' + esc(c.name || t('（未命名）', '(Unnamed)')) + '</span>' +
          '<span style="font-size:13px;color:var(--muted,#A88E9B);">' + esc(c.c_no || '') + '</span>' +
          (c.vip ? '<span style="font-size:12px;font-weight:600;padding:2px 10px;border-radius:999px;background:#FCE4EC;color:#A04A68;">VIP' + (c.vip_until ? ' · ' + c.vip_until : '') + '</span>' : '') +
          '<span style="font-size:12px;padding:2px 10px;border-radius:999px;background:#fff;border:1px solid var(--accent-soft,#FCE4EC);color:var(--muted,#A88E9B);">' + (c.source === 'online' ? t('线上', 'Online') : t('线下', 'Offline')) + '</span>' +
          '<span style="margin-left:auto;font-size:15px;color:#ff6fa5;font-weight:700;">$' + fmtMoney(st.sum) + '</span>' +
          '<span style="font-size:13px;color:var(--muted,#A88E9B);">' + st.count + ' ' + t('次', 'orders') + '</span>' +
        '</div>' +
        '<div style="font-size:13px;color:var(--muted,#A88E9B);margin-top:4px;">' + esc(c.email || '—') + ' · ' + esc(c.phone || '—') + (st.last ? ' · ' + t('最近', 'Last') + ' ' + st.last.order_no : '') + '</div>' +
      '</div>';
    }).join('');
    box.querySelectorAll('.cust-row').forEach(function (row) {
      row.addEventListener('click', function () {
        var c = CUST.list.filter(function (x) { return x.id === row.getAttribute('data-cid'); })[0];
        if (c) custDetail(c);
      });
    });
  }

  function custForm(c) {
    var panel = document.getElementById('tab-crm');
    var old = panel.querySelector('.cust-form-card'); if (old) old.remove();
    var div = document.createElement('div');
    div.className = 'card cust-form-card';
    div.style.cssText = 'padding:16px 20px;margin-bottom:14px;border:1.5px solid var(--accent-soft,#FCE4EC);';
    div.innerHTML =
      '<h3 style="margin:0 0 12px;font-size:17px;color:var(--text,#604C57);">' + (c ? t('编辑客户', 'Edit customer') : t('新建客户', 'New customer')) + (c ? ' · ' + esc(c.c_no) : '') + '</h3>' +
      '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:10px;">' +
        '<input id="cf-name" placeholder="' + t('姓名 / 称呼', 'Name') + '" value="' + escAttr(c ? c.name || '' : '') + '">' +
        '<input id="cf-email" placeholder="Email" value="' + escAttr(c ? c.email || '' : '') + '">' +
        '<input id="cf-phone" placeholder="' + t('电话', 'Phone') + '" value="' + escAttr(c ? c.phone || '' : '') + '">' +
        '<input id="cf-note" placeholder="' + t('备注（来源、喜好等）', 'Note') + '" value="' + escAttr(c ? c.note || '' : '') + '">' +
      '</div>' +
      '<div style="margin-top:12px;display:flex;gap:10px;">' +
        '<button class="btn-save-tb" id="cf-save">' + t('保存', 'Save') + '</button>' +
        '<button class="btn-mini" id="cf-cancel">' + t('取消', 'Cancel') + '</button>' +
      '</div>';
    panel.insertBefore(div, panel.children[0]);
    div.querySelector('#cf-cancel').addEventListener('click', function () { div.remove(); });
    div.querySelector('#cf-save').addEventListener('click', function () {
      var body = {
        p_id: c ? c.id : null,
        p_name: div.querySelector('#cf-name').value.trim(),
        p_email: div.querySelector('#cf-email').value.trim(),
        p_phone: div.querySelector('#cf-phone').value.trim(),
        p_note: div.querySelector('#cf-note').value.trim(),
        p_source: c ? (c.source || 'offline') : 'offline'
      };
      api('rpc/shop_customer_save', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
        .then(function (r) { return r.json(); })
        .then(function (j) {
          if (j && j.message) { toast(j.message); return; }
          toast(t('已保存', 'Saved'));
          if (window.loadShopOrders) loadShopOrders();
          loadCust();
          div.remove();
        });
    });
  }

  function custDetail(c) {
    var st = custStats(c);
    var panel = document.getElementById('tab-crm');
    var old = panel.querySelector('.cust-detail-card'); if (old) old.remove();
    var div = document.createElement('div');
    div.className = 'card cust-detail-card';
    div.style.cssText = 'padding:16px 20px;margin-bottom:14px;border:1.5px solid var(--accent-soft,#FCE4EC);';
    div.innerHTML =
      '<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">' +
        '<h3 style="margin:0;font-size:17px;color:var(--text,#604C57);">' + esc(c.name || '—') + ' <span style="font-size:13px;color:var(--muted,#A88E9B);font-weight:400;">' + esc(c.c_no) + '</span></h3>' +
        '<button class="btn-mini cd-edit" style="margin-left:auto;">' + t('编辑', 'Edit') + '</button>' +
        '<button class="btn-mini cd-vip">' + (c.vip ? t('取消 VIP', 'Remove VIP') : t('设为 VIP', 'Set VIP')) + '</button>' +
        '<button class="btn-mini cd-merge">' + t('合并重复客户', 'Merge duplicate') + '</button>' +
      '</div>' +
      '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:8px;margin:12px 0;font-size:14px;color:var(--text,#604C57);">' +
        '<div>' + t('邮箱', 'Email') + '：' + esc(c.email || '—') + '</div>' +
        '<div>' + t('电话', 'Phone') + '：' + esc(c.phone || '—') + '</div>' +
        '<div>' + t('来源', 'Source') + '：' + (c.source === 'online' ? t('线上', 'Online') : t('线下', 'Offline')) + '</div>' +
        '<div>' + t('累计消费', 'Spent') + '：<span style="color:#ff6fa5;font-weight:700;">$' + fmtMoney(st.sum) + '</span> · ' + st.count + t('次', '') + '</div>' +
      '</div>' +
      (c.note ? '<div style="font-size:13px;color:var(--muted,#A88E9B);margin-bottom:10px;">' + t('备注', 'Note') + '：' + esc(c.note) + '</div>' : '') +
      '<div style="font-size:14px;color:var(--text,#604C57);font-weight:600;margin-bottom:6px;">' + t('购买历史', 'Purchase history') + '</div>' +
      (st.ords.length ? st.ords.map(function (o) {
        var stl = { pending: '待付款', reviewing: '待审核', rejected: '凭证有误', paid: '已付款', shipped: '已发货', completed: '已完成', cancelled: '已取消', refunding: '退款中', refunded: '已退款' }[o.status] || o.status;
        var inc = ['paid', 'shipped', 'completed', 'refunding'].indexOf(o.status) >= 0;
        return '<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-top:1px solid var(--accent-soft,#FCE4EC);font-size:14px;' + (inc ? '' : 'opacity:.55;') + '">' +
          '<b style="color:var(--text,#604C57);">' + esc(o.order_no) + '</b>' +
          '<span style="color:var(--muted,#A88E9B);font-size:13px;">' + stl + ' · ' + (o.order_source === 'pos' ? t('线下', 'POS') : t('线上', 'Online')) + '</span>' +
          '<span style="margin-left:auto;color:#ff6fa5;font-weight:700;">$' + fmtMoney(o.total) + '</span></div>';
      }).join('') : '<p style="color:var(--muted,#A88E9B);font-size:14px;">' + t('还没有购买记录', 'No purchases yet') + '</p>');
    panel.insertBefore(div, panel.children[0]);
    div.querySelector('.cd-edit').addEventListener('click', function () { custForm(c); });
    div.querySelector('.cd-vip').addEventListener('click', function () {
      api('shop_customers?id=eq.' + c.id, { method: 'PATCH', body: JSON.stringify({ vip: !c.vip, vip_until: c.vip ? null : '2027-10-26', updated_at: new Date().toISOString() }) })
        .then(function (r) { if (!r.ok) { toast(t('操作失败', 'Failed')); return; } toast(!c.vip ? t('已设为 VIP（至 2027-10-26）', 'VIP set') : t('已取消 VIP', 'VIP removed')); div.remove(); loadCust(); });
    });
    div.querySelector('.cd-merge').addEventListener('click', function () {
      var other = prompt(t('输入要合并掉的重复客户编号（C-xxxxxx），其订单会挂到本客户，档案数据择优保留：', 'Enter duplicate customer no. to merge into this one:'));
      if (!other) return;
      var dup = CUST.list.filter(function (x) { return x.c_no === other.trim(); })[0];
      if (!dup) { toast(t('找不到这个客户编号', 'Customer not found')); return; }
      if (dup.id === c.id) { toast(t('不能和自己合并', 'Cannot merge with itself')); return; }
      uiConfirm(t('确认把 ') + dup.c_no + ' ' + t('合并进 ') + c.c_no + t(' 吗？历史订单保留，操作不可撤销。', 'Merge? This cannot be undone.'), function () {
        api('rpc/shop_customer_merge', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ p_keep: c.id, p_dup: dup.id }) })
          .then(function (r) { return r.json(); })
          .then(function (j) { if (j && j.message) { toast(j.message); return; } toast(t('已合并', 'Merged')); div.remove(); loadCust(); });
      });
    });
  }

  /* ═══════════ 线下开单 ═══════════ */
  var POS = { items: [], prods: [], custs: [], customerId: null, channel: 'cash', test: true };

  CRM.bootPos = function () {
    var panel = document.getElementById('tab-pos');
    if (panel.dataset.booted) return;
    panel.dataset.booted = '1';
    renderPos();
    api('products?select=id,name,price,stock,sold,image_url&order=created_at.desc&limit=200').then(function (r) { return r.json(); }).then(function (rows) { POS.prods = rows || []; renderPosPicks(); });
    api('shop_customers?select=id,c_no,name,email&order=created_at.desc&limit=200').then(function (r) { return r.json(); }).then(function (rows) { POS.custs = rows || []; });
  };

  function posTotal() {
    var sum = 0; POS.items.forEach(function (x) { sum += x.price * x.qty; });
    return sum;
  }

  function renderPos() {
    var panel = document.getElementById('tab-pos');
    panel.innerHTML =
      '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:16px;">' +
        '<div class="card" style="padding:16px 20px;">' +
          '<h3 style="margin:0 0 10px;font-size:16px;color:var(--text,#604C57);">' + t('选商品', 'Pick products') + '</h3>' +
          '<input id="pos-q" placeholder="' + t('搜索商品，或直接添加临时自定义商品', 'Search products / add custom item') + '" style="width:100%;box-sizing:border-box;padding:10px 14px;font-size:15px;border:1.5px solid var(--accent-soft,#FCE4EC);border-radius:12px;outline:none;font-family:inherit;color:var(--text,#604C57);background:#fff;">' +
          '<div id="pos-picks" style="margin-top:10px;max-height:340px;overflow:auto;"></div>' +
          '<div style="margin-top:10px;font-size:13px;color:var(--muted,#A88E9B);">' + t('关联客户（可匿名）', 'Customer (anonymous ok)') + '</div>' +
          '<div style="margin-top:6px;"><span class="chip on" id="pos-anon">' + t('匿名销售', 'Anonymous') + '</span> <span class="chip" id="pos-pickcust">' + t('选已有客户', 'Pick customer') + '</span></div>' +
          '<div id="pos-custpick" style="display:none;margin-top:8px;"><select id="pos-cust" style="width:100%;padding:9px 12px;border-radius:10px;border:1.5px solid var(--accent-soft,#FCE4EC);font-family:inherit;color:var(--text,#604C57);background:#fff;"></select></div>' +
        '</div>' +
        '<div class="card" style="padding:16px 20px;">' +
          '<h3 style="margin:0 0 10px;font-size:16px;color:var(--text,#604C57);">' + t('收款', 'Payment') + ' · <span id="pos-no" style="color:#ff6fa5;">—</span></h3>' +
          '<div id="pos-chans" style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px;"></div>' +
          '<div style="font-size:13px;color:#8a6d3b;background:#fff7f0;border:1px solid #f0d9c0;border-radius:10px;padding:8px 12px;margin-bottom:10px;">' + t('现金 / 转账需实际收到钱后再点「确认收款」——只保存记录不代表已收款。', 'Cash/transfers: confirm only after money actually received.') + '</div>' +
          '<div id="pos-cart"></div>' +
          '<div id="pos-sum"></div>' +
          '<button class="btn-save-tb" id="pos-save" style="width:100%;margin-top:12px;">' + t('保存销售记录（测试模式）', 'Save sale (test mode)') + '</button>' +
          '<div id="pos-after" style="margin-top:12px;"></div>' +
        '</div>' +
      '</div>' +
      '<div style="margin-top:14px;font-size:13px;color:var(--muted,#A88E9B);">' + t('编号规则：正式 SY-POS-001…，测试 SY-POS-TEST-001…，与线上订单独立计数；重复点击保存不会产生重复记录。', 'POS numbering is independent from online orders; duplicate submits are protected.') + '</div>';
    var chans = [['cash', t('💵 现金', 'Cash')], ['zelle', 'Zelle'], ['venmo', 'Venmo'], ['paypal', 'PayPal'], ['stripe', t('Stripe 扫码', 'Stripe QR')], ['other', t('＋ 其他', 'Other')]];
    var chansEl = panel.querySelector('#pos-chans');
    chansEl.innerHTML = chans.map(function (c) { return '<span class="paytab' + (POS.channel === c[0] ? ' on' : '') + '" data-ch="' + c[0] + '">' + c[1] + '</span>'; }).join('');
    chansEl.querySelectorAll('.paytab').forEach(function (el) {
      el.addEventListener('click', function () { POS.channel = el.getAttribute('data-ch'); renderPos(); });
    });
    panel.querySelector('#pos-anon').addEventListener('click', function () { POS.customerId = null; renderPos(); });
    panel.querySelector('#pos-pickcust').addEventListener('click', function () {
      var sel = panel.querySelector('#pos-custpick');
      sel.style.display = sel.style.display === 'none' ? '' : 'none';
      var sel2 = panel.querySelector('#pos-cust');
      if (!sel2.options.length) {
        sel2.innerHTML = '<option value="">' + t('（不关联）', '(none)') + '</option>' + POS.custs.map(function (c) { return '<option value="' + escAttr(c.id) + '">' + esc((c.name || c.c_no) + (c.email ? ' · ' + c.email : '')) + '</option>'; }).join('');
      }
      sel2.addEventListener('change', function () { POS.customerId = sel2.value || null; });
    });
    panel.querySelector('#pos-q').addEventListener('input', renderPosPicks);
    panel.querySelector('#pos-save').addEventListener('click', posSave);
    renderPosPicks(); renderPosCart();
  }

  function renderPosPicks() {
    var box = document.getElementById('pos-picks'); if (!box) return;
    var q = (document.getElementById('pos-q').value || '').trim().toLowerCase();
    var picks = POS.prods.filter(function (p) { return !p.sold; }).filter(function (p) { return !q || (p.name || '').toLowerCase().indexOf(q) >= 0; }).slice(0, 12);
    box.innerHTML = picks.map(function (p, i) {
      return '<div class="pick" data-i="' + i + '"><img src="' + escAttr(p.image_url || '') + '" onerror="this.style.display=\'none\'">' +
        '<div><div class="nm">' + esc(p.name || '') + '</div><div class="st">' + t('库存', 'Stock') + ' ' + (p.stock == null ? '—' : p.stock) + '</div><div class="pr">$' + fmtMoney(p.price) + '</div></div>' +
        '<div class="qty"><button class="qb" data-add="' + escAttr(p.id) + '">＋</button></div></div>';
    }).join('') +
    '<div class="pick" style="border-style:dashed;" id="pos-custom"><div style="width:56px;height:56px;border-radius:12px;background:#FCE4EC;display:flex;align-items:center;justify-content:center;color:#A88E9B;font-size:22px;">＋</div>' +
      '<div><div class="nm">' + t('临时自定义商品（不上架）', 'Custom item (not listed)') + '</div><div class="st">' + t('名称 / 价格现场填，只属于本笔销售', 'Only belongs to this sale') + '</div></div></div>';
    box.querySelectorAll('[data-add]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var p = POS.prods.filter(function (x) { return x.id === btn.getAttribute('data-add'); })[0];
        if (!p) return;
        var ex = POS.items.filter(function (x) { return x.id === p.id; })[0];
        if (ex) { ex.qty++; } else { POS.items.push({ id: p.id, name: p.name, price: Number(p.price) || 0, qty: 1, image: p.image_url || '', sku: '' }); }
        renderPosCart();
      });
    });
    var cu = box.querySelector('#pos-custom');
    if (cu) cu.addEventListener('click', function () {
      var name = prompt(t('临时商品名称：', 'Custom item name:'));
      if (!name) return;
      var price = parseFloat(prompt(t('价格（美元）：', 'Price (USD):')) || '0');
      if (isNaN(price) || price < 0) { toast(t('价格不对', 'Bad price')); return; }
      POS.items.push({ id: '', name: name, price: price, qty: 1, image: '', sku: '' });
      renderPosCart();
    });
  }

  function renderPosCart() {
    var box = document.getElementById('pos-cart'); if (!box) return;
    box.innerHTML = POS.items.map(function (x, i) {
      return '<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-top:1px solid var(--accent-soft,#FCE4EC);font-size:14px;">' +
        '<div style="flex:1;min-width:0;"><b style="color:var(--text,#604C57);">' + esc(x.name) + '</b>' +
        (x.id ? '' : ' <span style="font-size:12px;color:var(--muted,#A88E9B);">' + t('临时', 'custom') + '</span>') +
        '<div style="color:#ff6fa5;font-weight:600;">$' + fmtMoney(x.price) + '</div></div>' +
        '<button class="qb pos-dec" data-i="' + i + '">−</button><b style="color:var(--text,#604C57);">' + x.qty + '</b><button class="qb pos-inc" data-i="' + i + '">＋</button>' +
        '<button class="pos-rm" data-i="' + i + '" style="border:none;background:none;color:#d96570;font-size:13px;cursor:pointer;text-decoration:underline;">' + t('删', 'Del') + '</button>' +
        '<b style="min-width:70px;text-align:right;color:var(--text,#604C57);">$' + fmtMoney(x.price * x.qty) + '</b></div>';
    }).join('');
    var sum = document.getElementById('pos-sum');
    sum.innerHTML = '<div style="display:flex;justify-content:space-between;font-size:17px;font-weight:700;color:var(--text,#604C57);border-top:1.5px solid var(--accent-soft,#FCE4EC);padding-top:10px;margin-top:4px;"><span>' + t('应收', 'Total') + '</span><span style="color:#ff6fa5;">$' + fmtMoney(posTotal()) + '</span></div>';
    box.querySelectorAll('.pos-dec').forEach(function (b) { b.addEventListener('click', function () { var x = POS.items[+b.getAttribute('data-i')]; x.qty = Math.max(1, x.qty - 1); renderPosCart(); }); });
    box.querySelectorAll('.pos-inc').forEach(function (b) { b.addEventListener('click', function () { POS.items[+b.getAttribute('data-i')].qty++; renderPosCart(); }); });
    box.querySelectorAll('.pos-rm').forEach(function (b) { b.addEventListener('click', function () { POS.items.splice(+b.getAttribute('data-i'), 1); renderPosCart(); }); });
  }

  function posSave() {
    if (!POS.items.length) { toast(t('先选商品', 'Pick some products first')); return; }
    var note = '线下开单 · ' + POS.channel;
    var body = {
      p_items: POS.items.map(function (x) { return { id: x.id, name: x.name, price: x.price, qty: x.qty, image: x.image, sku: x.sku }; }),
      p_pay_channel: POS.channel,
      p_customer_id: POS.customerId,
      p_note: note,
      p_client_token: 'pos-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8),
      p_test: POS.test
    };
    var btn = document.getElementById('pos-save');
    btn.disabled = true; btn.textContent = t('保存中…', 'Saving…');
    api('rpc/shop_pos_create', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      .then(function (r) { return r.json(); })
      .then(function (j) {
        btn.disabled = false; btn.textContent = t('保存销售记录（测试模式）', 'Save sale (test mode)');
        if (j && j.message) { toast(j.message); return; }
        toast(t('已保存：', 'Saved: ') + j.order_no);
        POS.lastSale = j;
        renderPosAfter(j);
        if (window.loadShopOrders) loadShopOrders();
        POS.items = []; renderPosCart();
      })
      .catch(function () { btn.disabled = false; btn.textContent = t('保存失败，再试', 'Save failed'); });
  }

  function renderPosAfter(j) {
    var box = document.getElementById('pos-after');
    box.innerHTML =
      '<div class="card" style="padding:14px 16px;border:1.5px solid var(--accent-soft,#FCE4EC);">' +
        '<div style="font-size:15px;font-weight:700;color:var(--text,#604C57);">' + t('销售编号', 'Sale No.') + '：<span style="color:#ff6fa5;">' + esc(j.order_no) + '</span>' + (POS.test ? ' <span style="font-size:12px;padding:2px 10px;border-radius:999px;background:#fff7f0;border:1px solid #f0d9c0;color:#8a6d3b;">TEST 测试模式</span>' : '') + '</div>' +
        '<div style="font-size:14px;color:var(--muted,#A88E9B);margin:4px 0 10px;">' + t('应收', 'Total') + ' $' + fmtMoney(j.total) + ' · ' + t('付款方式', 'Channel') + ' ' + POS.channel + '</div>' +
        '<div style="display:flex;gap:8px;flex-wrap:wrap;">' +
          '<button class="btn-save-tb pos-confirm">' + t('✓ 确认已收款', 'Confirm received') + '</button>' +
          (POS.channel === 'stripe' ? '<button class="btn-mini pos-stripe">' + t('生成 Stripe 测试付款链接 + 二维码', 'Stripe test link + QR') + '</button>' : '') +
          '<button class="btn-mini pos-cancel">' + t('取消本笔（回补库存）', 'Cancel (restock)') + '</button>' +
        '</div>' +
        '<div class="pos-stripe-box" style="margin-top:10px;"></div>' +
      '</div>';
    box.querySelector('.pos-confirm').addEventListener('click', function () {
      uiConfirm(t('确认已经实际收到这笔钱了吗？（现金/转账请核对到账）', 'Confirm money actually received?'), function () {
        api('rpc/shop_pos_confirm', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ p_order_id: j.order_id }) })
          .then(function (r) { return r.json(); })
          .then(function (x) { if (x && x.message) { toast(x.message); return; } toast(t('已确认收款 ✓', 'Confirmed')); box.querySelector('.pos-confirm').disabled = true; });
      });
    });
    box.querySelector('.pos-cancel').addEventListener('click', function () {
      uiConfirm(t('取消这笔线下销售？已扣的库存会加回去。', 'Cancel this sale? Stock will be restored.'), function () {
        api('rpc/shop_pos_confirm', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ p_order_id: j.order_id, p_cancel: true }) })
          .then(function (r) { return r.json(); })
          .then(function (x) { if (x && x.message) { toast(x.message); return; } toast(t('已取消，库存已回补', 'Cancelled')); box.remove(); });
      });
    });
    var sb = box.querySelector('.pos-stripe');
    if (sb) sb.addEventListener('click', function () {
      var sbox = box.querySelector('.pos-stripe-box');
      sbox.innerHTML = '<p style="color:var(--muted,#A88E9B);font-size:14px;">' + t('正在创建 Stripe 测试付款链接…', 'Creating Stripe test link…') + '</p>';
      var adminAt = (typeof ACCESS !== 'undefined' && ACCESS) || (function () { try { return (JSON.parse(localStorage.getItem('yuki-admin-session') || 'null') || {}).a || ''; } catch (e) { return ''; } })();
      fetch(SUPA + '/functions/v1/stripe-checkout', {
        method: 'POST',
        headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': 'Bearer ' + adminAt, 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: j.order_id, origin: location.origin })
      }).then(function (r) { return r.json().then(function (x) { return { ok: r.ok, x: x }; }); }).then(function (res) {
        if (!res.ok || !res.x.url) { sbox.innerHTML = '<div class="warn" style="background:#fff7f0;border:1px solid #f0d9c0;color:#8a6d3b;font-size:13px;border-radius:10px;padding:8px 12px;">' + t('付款链接创建失败：', 'Link failed: ') + esc((res.x && (res.x.error || res.x.message)) || '未知错误') + '</div>'; return; }
        sbox.innerHTML =
          '<div style="display:flex;gap:14px;align-items:center;flex-wrap:wrap;">' +
            '<img src="https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=' + encodeURIComponent(res.x.url) + '" alt="QR" style="width:150px;height:150px;border-radius:12px;border:1px solid var(--accent-soft,#FCE4EC);">' +
            '<div style="flex:1;min-width:200px;font-size:13px;word-break:break-all;color:var(--text,#604C57);">' +
              '<b>TEST</b> ' + t('测试付款链接（手机扫码或复制打开，测试卡 4242…，不产生真实扣款）：', 'Test link (no real charge):') + '<br>' +
              '<a href="' + escAttr(res.x.url) + '" target="_blank" style="color:#A04A68;text-decoration:underline;">' + esc(res.x.url.slice(0, 60)) + '…</a>' +
            '</div></div>';
      }).catch(function () { sbox.innerHTML = '<p style="color:#d96570;font-size:14px;">' + t('网络异常，再试一次', 'Network error') + '</p>'; });
    });
  }

  /* ═══════════ 邮件与联系人同步设置 ═══════════ */
  CRM.bootMailsync = function () {
    var panel = document.getElementById('tab-mailsync');
    if (panel.dataset.booted) return;
    panel.dataset.booted = '1';
    panel.innerHTML =
      '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(340px,1fr));gap:16px;">' +
        '<div class="card" style="padding:16px 20px;">' +
          '<h3 style="margin:0 0 10px;font-size:16px;color:var(--text,#604C57);">📧 ' + t('Gmail 自动分类（过滤器方案）', 'Gmail auto labels (filters)') + '</h3>' +
          '<p style="font-size:13px;color:var(--muted,#A88E9B);line-height:1.8;">' + t('默认只加标签，不删邮件、不动收件箱。以下过滤器待你完成 Google OAuth 授权后一键创建：', 'Labels only — nothing deleted. Filters created after you authorize Google OAuth:') + '</p>' +
          '<div style="font-size:14px;color:var(--text,#604C57);line-height:2.4;">' +
            '<span class="chip on">Snow Yuzu/订单</span> ' + t('主题含「订单确认 / 付款成功」', 'subject: order confirm/paid') + '<br>' +
            '<span class="chip on">Snow Yuzu/发货</span> ' + t('主题含「订单已发货」', 'subject: shipped') + '<br>' +
            '<span class="chip on">Snow Yuzu/取消退款</span> ' + t('主题含「退款通知 / 订单已取消」', 'subject: refund/cancel') + '<br>' +
            '<span class="chip on">Snow Yuzu/新品上架</span> ' + t('主题含「新品上架」', 'subject: new item') + '<br>' +
            '<span class="chip on">Snow Yuzu/客户留言</span> ' + t('后台留言通知', 'contact notice') + '<br>' +
            '<span class="chip on">Snow Yuzu/VIP会员</span> ' + t('VIP 变更通知', 'VIP notice') +
          '</div>' +
          '<div style="font-size:13px;color:#8a6d3b;background:#fff7f0;border:1px solid #f0d9c0;border-radius:10px;padding:8px 12px;margin-top:10px;">' + t('需要 Google OAuth 授权（gmail.labels + gmail.filters）。SMTP 发信权限不等于邮箱管理权限——等你授权，我不会动你的邮箱。', 'Needs your Google OAuth (gmail.labels+filters). SMTP access is NOT mailbox access — nothing touched until you authorize.') + '</div>' +
        '</div>' +
        '<div class="card" style="padding:16px 20px;">' +
          '<h3 style="margin:0 0 10px;font-size:16px;color:var(--text,#604C57);">👥 ' + t('Google Contacts 联系人同步（默认关）', 'Google Contacts sync (off)') + '</h3>' +
          '<div style="font-size:14px;color:var(--text,#604C57);line-height:1.9;">' +
            t('同步范围：仅「已同意接收通知」的客户；字段：姓名 / 邮箱 / 电话。', 'Scope: only customers who agreed to notices; fields: name/email/phone.') + '<br>' +
            t('匹配：按邮箱精确匹配，已存在只更新不重建。', 'Match by exact email; update, never duplicate.') + '<br>' +
            t('联系人标签：', 'Contact labels: ') + '<span class="chip on">Snow Yuzu/普通客户</span> <span class="chip on">Snow Yuzu/VIP</span> <span class="chip on">Snow Yuzu/回头客</span>' +
          '</div>' +
          '<div id="ms-sync-state" style="margin-top:12px;"></div>' +
          '<div style="font-size:13px;color:#8a6d3b;background:#fff7f0;border:1px solid #f0d9c0;border-radius:10px;padding:8px 12px;margin-top:10px;">' + t('必须等你本人完成 Google 授权后才会开启真实同步；现有 Google 联系人不会被修改或删除。Gmail 标签（邮件）≠ Contacts 标签（人物），两套分开。', 'Real sync waits for your authorization. Existing contacts untouched. Gmail labels ≠ Contacts labels.') + '</div>' +
        '</div>' +
      '</div>';
    loadSyncState();
  };

  function loadSyncState() {
    var box = document.getElementById('ms-sync-state');
    api('site_settings?key=eq.crm_sync&select=value').then(function (r) { return r.json(); }).then(function (rows) {
      var raw = (rows && rows[0] && rows[0].value) || '';
      try { raw = JSON.parse(raw); } catch (e) {}
      var st = (raw && typeof raw === 'object') ? raw : {};
      box.innerHTML =
        '<div style="display:flex;align-items:center;gap:10px;font-size:14px;color:var(--text,#604C57);">' +
          '<span>' + t('同步开关', 'Sync switch') + '</span>' +
          '<span style="font-size:12px;padding:2px 12px;border-radius:999px;background:' + (st.enabled ? '#FCE4EC;color:#A04A68;' : '#f3ece6;color:var(--muted,#A88E9B);') + 'font-weight:600;">' + (st.enabled ? t('已开启（待授权）', 'Enabled (pending auth)') : t('关闭', 'Off')) + '</span>' +
          '<button class="btn-mini" id="ms-toggle">' + (st.enabled ? t('关闭', 'Turn off') : t('开启', 'Turn on')) + '</button>' +
        '</div>' +
        '<div style="font-size:12px;color:var(--muted,#A88E9B);margin-top:6px;">' + t('状态：', 'Status: ') + (st.oauth_done ? t('Google 已授权，同步就绪', 'Google authorized, ready') : t('等待柚子完成 Google OAuth 授权', 'Waiting for your Google OAuth authorization')) + '</div>';
      box.querySelector('#ms-toggle').addEventListener('click', function () {
        var next = { enabled: !(st && st.enabled), oauth_done: false, updated: new Date().toISOString() };
        api('site_settings', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Prefer': 'resolution=merge-duplicates' }, body: JSON.stringify({ key: 'crm_sync', value: next }) })
          .then(function (r) { if (!r.ok) { toast(t('保存失败', 'Save failed')); return; } toast(t('已更新（真实同步仍需 Google 授权）', 'Updated (real sync still needs auth)')); loadSyncState(); });
      });
    });
  }
})();
