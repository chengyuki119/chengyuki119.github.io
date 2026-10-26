/* ═══════════ 全站统一 Footer（双语文案 · 粉色系 · 手机单栏 / 电脑两栏）═══════════
   用法：页面引入本文件后调用 window.renderSiteFooter()。
   - 页面里已有 <footer>：保留原 <footer> 标签（避免破坏原样式选择器），只把内容替换成统一 Footer。
   - 页面里没有 <footer>：在 </body> 前插入一个。
   - 语言：读取 window.LANG（localStorage 'yuki-lang'，'zh'/'en'）；
     监听 document 上 .lang-btn 的 click，延迟 50ms 重渲染（site-common 本身会整页刷新，这里做兜底）。 */
(function () {
  'use strict';

  var STYLE_ID = 'sy-footer-style';

  var TEXT = {
    zh: {
      account: '我的账户',
      myaccount: '账户中心（登录 / 订单）',
      service: '客户服务',
      about: '关于 Snow Yuzu',
      findme: '找到我（社交平台）',
      shop: '小铺',
      policies: '网站政策',
      contact: '联系我们',
      faq: '常见问题',
      'return-policy': '退货与退款政策',
      'shipping-policy': '配送政策',
      'privacy-policy': '隐私政策',
      'terms-of-service': '服务条款',
      copy: '© 2026 SnowYuzu. 保留所有权利。'
    },
    en: {
      account: 'My Account',
      myaccount: 'Account (Sign in / Orders)',
      service: 'Customer Service',
      about: 'About Snow Yuzu',
      findme: 'Find Me (Social)',
      shop: 'Shop',
      policies: 'Policies',
      contact: 'Contact Us',
      faq: 'FAQ',
      'return-policy': 'Return & Refund Policy',
      'shipping-policy': 'Shipping Policy',
      'privacy-policy': 'Privacy Policy',
      'terms-of-service': 'Terms of Service',
      copy: '© 2026 SnowYuzu. All rights reserved.'
    }
  };

  var LINKS = {
    account: [['myaccount', '/account/']],
    service: [['contact', '/askbox/'], ['faq', '/faq/'], ['return-policy', '/return-policy/'], ['shipping-policy', '/shipping-policy/']],
    about: [['findme', '/about/'], ['shop', '/shop/']],
    policies: [['privacy-policy', '/privacy-policy/'], ['terms-of-service', '/terms-of-service/']]
  };

  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function currentLang() {
    if (window.LANG === 'zh' || window.LANG === 'en') return window.LANG;
    try {
      var l = localStorage.getItem('yuki-lang');
      if (l === 'en') return 'en';
    } catch (e) {}
    return 'zh';
  }

  function ensureStyle() {
    if (document.getElementById(STYLE_ID)) return;
    var st = document.createElement('style');
    st.id = STYLE_ID;
    /* 电商多列 Footer（她 2026-10-26：参考 lululemon 多列布局，去掉大圆角粉卡，白/极浅粉底、顶部细分隔线） */
    st.textContent =
      '.sy-footer{max-width:1400px;margin:26px auto 22px;padding:0 24px;font-family:inherit;box-sizing:border-box;}' +
      '.sy-footer-inner{border-top:1px solid var(--accent,#FFD9E6);padding-top:30px;}' +
      '.sy-footer-cols{display:grid;grid-template-columns:repeat(4,1fr);gap:26px 36px;}' +
      '@media (max-width:899px){.sy-footer-cols{grid-template-columns:1fr 1fr;}}' +
      '@media (max-width:559px){.sy-footer{padding:0 18px 6px;margin-bottom:30px;}.sy-footer-cols{grid-template-columns:1fr;gap:22px;}}' +
      '.sy-footer-head{font-size:15px;font-weight:700;color:var(--text,#604C57);margin-bottom:12px;letter-spacing:.03em;}' +
      '.sy-footer-links{display:flex;flex-direction:column;align-items:flex-start;}' +
      '.sy-footer-link{color:var(--muted,#A88E9B);font-size:15px;line-height:2.15;text-decoration:none;transition:color .2s;}' +
      '.sy-footer-link:hover{color:var(--price,#FF6FA5);}' +
      '.sy-footer-bottom{display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px 18px;' +
        'border-top:1px solid var(--accent,#FFD9E6);margin-top:30px;padding-top:18px;font-size:14px;color:var(--muted,#A88E9B);}' +
      '@media (max-width:559px){.sy-footer-bottom{flex-direction:column;align-items:flex-start;}}' +
      '.sy-footer-bottom .sy-footer-legal{display:flex;gap:18px;flex-wrap:wrap;}' +
      '.sy-footer-bottom a{color:var(--muted,#A88E9B);text-decoration:none;transition:color .2s;}' +
      '.sy-footer-bottom a:hover{color:var(--price,#FF6FA5);}';;
    document.head.appendChild(st);
  }

  function buildHtml() {
    var lang = currentLang();
    var txt = TEXT[lang] || TEXT.zh;
    var col = function (titleKey, items) {
      return '<div class="sy-footer-col">' +
        '<div class="sy-footer-head">' + esc(txt[titleKey]) + '</div>' +
        '<div class="sy-footer-links">' +
        items.map(function (p) {
          return '<a class="sy-footer-link" href="' + esc(p[1]) + '">' + esc(txt[p[0]]) + '</a>';
        }).join('') +
        '</div></div>';
    };
    return '<div class="sy-footer"><div class="sy-footer-inner">' +
      '<div class="sy-footer-cols">' +
        col('account', LINKS.account) + col('service', LINKS.service) +
        col('about', LINKS.about) + col('policies', LINKS.policies) +
      '</div>' +
      '<div class="sy-footer-bottom">' +
        '<span>' + esc(txt.copy) + '</span>' +
        '<span class="sy-footer-legal">' +
          '<a href="/privacy-policy/">' + esc(txt['privacy-policy']) + '</a>' +
          '<a href="/terms-of-service/">' + esc(txt['terms-of-service']) + '</a>' +
        '</span>' +
      '</div>' +
      '</div></div>';
  }

  window.renderSiteFooter = function () {
    ensureStyle();
    var html = buildHtml();
    var footer = document.querySelector('footer');
    if (footer) {
      // 保留原 <footer> 标签（页面已有 footer 样式不冲突），只替换内容；卡片自带外距，清掉旧 footer 的默认 padding 避免三重叠底边距
      footer.style.padding = '0';
      footer.innerHTML = html;
      return;
    }
    // 页面没有 footer：新建一个插到 </body> 前
    var el = document.createElement('footer');
    el.style.padding = '0';
    el.innerHTML = html;
    document.body.appendChild(el);
  };

  // 语言切换时跟随更新（延迟 50ms，等页面自身逻辑先跑）
  if (!window.__syFooterLangBound) {
    window.__syFooterLangBound = true;
    document.addEventListener('click', function (e) {
      var btn = e.target && e.target.closest ? e.target.closest('.lang-btn') : null;
      if (!btn) return;
      setTimeout(function () { window.renderSiteFooter(); }, 50);
    });
  }
})();
