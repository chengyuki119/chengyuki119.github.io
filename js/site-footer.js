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
      brandTag: '小柚的小世界',
      service: '客户服务',
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
      brandTag: "Yuki's little world",
      service: 'Customer Service',
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
    service: [['contact', '/askbox/'], ['faq', '/faq/']],
    policies: [
      ['return-policy', '/return-policy/'],
      ['shipping-policy', '/shipping-policy/'],
      ['privacy-policy', '/privacy-policy/'],
      ['terms-of-service', '/terms-of-service/']
    ]
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
    /* 大圆角卡片式 Footer（她 2026-10-25：算了，所有页面都要卡片样式） */
    st.textContent =
      '.sy-footer{max-width:1080px;margin:20px auto 26px;padding:34px 48px 30px;font-family:inherit;' +
        'background:var(--card,#FFF0F5);border-radius:28px;box-sizing:border-box;}' +
      '.sy-footer-top{display:flex;align-items:baseline;gap:12px;padding-bottom:18px;}' +
      '.sy-footer-brand{font-family:var(--font-heading,"Millo Body Heavy",sans-serif);font-size:22px;font-weight:600;color:var(--text,#604C57);letter-spacing:.5px;}' +
      '.sy-footer-tag{font-size:15px;color:var(--muted,#A88E9B);}' +
      '.sy-footer-div{border:none;border-top:1px solid var(--accent,#ffd9e6);margin:0 0 24px;}' +
      '.sy-footer-cols{display:grid;grid-template-columns:1fr 1fr;gap:28px 40px;}' +
      '@media (max-width:639px){' +
        '.sy-footer{margin:14px 14px 20px;padding:26px 22px 24px;border-radius:22px;}' +
        '.sy-footer-cols{grid-template-columns:1fr;gap:22px;}}' +
      '.sy-footer-head{font-size:16px;font-weight:700;color:var(--text,#604C57);margin-bottom:12px;}' +
      '.sy-footer-links{display:flex;flex-direction:column;align-items:flex-start;gap:10px;}' +
      '.sy-footer-link{color:var(--text,#604C57);font-size:16px;line-height:1.5;text-decoration:none;transition:color .2s;}' +
      '.sy-footer-link:hover{color:#A04A68;}' +
      '.sy-footer-copy{margin-top:26px;text-align:center;font-size:15px;color:var(--muted,#A88E9B);}';
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
    return '<div class="sy-footer">' +
      '<div class="sy-footer-top"><span class="sy-footer-brand">SnowYuzu</span>' +
        '<span class="sy-footer-tag">' + esc(txt.brandTag) + '</span></div>' +
      '<hr class="sy-footer-div">' +
      '<div class="sy-footer-cols">' + col('service', LINKS.service) + col('policies', LINKS.policies) + '</div>' +
      '<div class="sy-footer-copy">' + esc(txt.copy) + '</div>' +
      '</div>';
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
