/* ═══ 全站社交卡片（「关于 Snow Yuzu」页用）═══
   数据源与主页「找到我」同一份：site_settings.key='links'（后台「主页管理」维护），单一数据源不重复录入。
   图标与 index.html 的 HOME_ICONS 同一套 SVG。 */
(function () {
  'use strict';
  var HOME_ICONS = {
    gmail: '<svg viewBox="0 0 24 24" fill="none" stroke="#ea8c7b" stroke-width="2"><rect x="2" y="4" width="20" height="16" rx="3"/><path d="m2 7 10 6L22 7"/></svg>',
    instagram: '<svg viewBox="0 0 24 24" fill="none" stroke="#e073a8" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="#e073a8" stroke="none"/></svg>',
    x: '<svg viewBox="0 0 24 24" fill="var(--text,#604C57)"><path d="M18.9 2H22l-6.8 7.8L23.2 22h-6.3l-4.9-6.4L6.4 22H3.3l7.3-8.3L1.2 2h6.4l4.4 5.9L18.9 2Zm-1.1 18h1.7L7 3.7H5.2L17.8 20Z"/></svg>',
    discord: '<svg viewBox="0 0 24 24" fill="#5865f2"><path d="M20.32 4.37a19.8 19.8 0 0 0-4.89-1.52.07.07 0 0 0-.08.04c-.21.38-.44.87-.6 1.25a18.3 18.3 0 0 0-5.5 0 12.6 12.6 0 0 0-.61-1.25.08.08 0 0 0-.08-.04 19.7 19.7 0 0 0-4.88 1.52.07.07 0 0 0-.04.03C.53 9.05-.32 13.58.1 18.06a.08.08 0 0 0 .03.05 19.9 19.9 0 0 0 6 3.03.08.08 0 0 0 .08-.03c.46-.63.87-1.3 1.22-2a.08.08 0 0 0-.04-.11 13.1 13.1 0 0 1-1.87-.9.08.08 0 0 1-.01-.13c.13-.09.25-.19.37-.29a.07.07 0 0 1 .08 0 14.2 14.2 0 0 0 12.06 0 .07.07 0 0 1 .08 0c.12.1.25.2.38.29a.08.08 0 0 1-.01.13c-.6.35-1.22.64-1.87.9a.08.08 0 0 0-.04.11c.36.7.77 1.37 1.22 2a.08.08 0 0 0 .08.03 19.8 19.8 0 0 0 6.02-3.03.08.08 0 0 0 .03-.05c.5-5.18-.84-9.68-3.55-13.66a.06.06 0 0 0-.03-.03ZM8.02 15.33c-1.18 0-2.16-1.08-2.16-2.42 0-1.33.96-2.42 2.16-2.42 1.21 0 2.18 1.1 2.16 2.42 0 1.34-.96 2.42-2.16 2.42Zm7.97 0c-1.18 0-2.16-1.08-2.16-2.42 0-1.33.95-2.42 2.16-2.42 1.21 0 2.18 1.1 2.16 2.42 0 1.34-.95 2.42-2.16 2.42Z"/></svg>',
    wechat: '<svg viewBox="0 0 24 24" fill="#57bb6a"><path d="M9.3 4C5.3 4 2 6.7 2 10.1c0 1.9 1 3.5 2.7 4.7l-.7 2.1 2.4-1.2c.7.2 1.4.4 2.2.4h.4a5.5 5.5 0 0 1-.2-1.5c0-3.2 3-5.8 6.7-5.8h.4C15.3 6 12.6 4 9.3 4ZM7 7.4a.9.9 0 1 1 0 1.8.9.9 0 0 1 0-1.8Zm4.6 0a.9.9 0 1 1 0 1.8.9.9 0 0 1 0-1.8ZM15.5 10c-3.2 0-5.8 2.1-5.8 4.8 0 2.6 2.6 4.8 5.8 4.8.6 0 1.2-.1 1.8-.3l2 1-.6-1.7c1.4-.9 2.3-2.2 2.3-3.8 0-2.6-2.6-4.8-5.5-4.8Zm-2 2.3a.8.8 0 1 1 0 1.6.8.8 0 1 1 0-1.6Zm4 0a.8.8 0 1 1 0 1.6.8.8 0 1 1 0-1.6Z"/></svg>',
    xhs: '<svg viewBox="0 0 24 24"><rect x="2" y="2" width="20" height="20" rx="6" fill="#ff2442"/><text x="12" y="16.5" text-anchor="middle" font-size="11" font-weight="bold" fill="#ffffff">红</text></svg>',
    douyin: '<svg viewBox="0 0 24 24" fill="#5ad7d0"><path d="M16.6 3c.4 2.3 1.9 3.8 4.4 4v3c-1.7 0-3.2-.5-4.4-1.4v6.6c0 3.5-2.6 5.8-5.9 5.8-3.1 0-5.7-2.4-5.7-5.6 0-3.3 2.9-5.8 6.3-5.4v3.1c-1.7-.5-3.2.5-3.2 2.2 0 1.5 1.2 2.6 2.6 2.6 1.6 0 2.8-1.1 2.8-3.2V3h3.1Z"/></svg>',
    netease: '<svg viewBox="0 0 24 24" fill="none" stroke="#e35d5d" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/></svg>',
    tiktok: '<svg viewBox="0 0 24 24" fill="#1c1c1e"><path d="M16.6 3c.4 2.3 1.9 3.8 4.4 4v3c-1.7 0-3.2-.5-4.4-1.4v6.6c0 3.5-2.6 5.8-5.9 5.8-3.1 0-5.7-2.4-5.7-5.6 0-3.3 2.9-5.8 6.3-5.4v3.1c-1.7-.5-3.2.5-3.2 2.2 0 1.5 1.2 2.6 2.6 2.6 1.6 0 2.8-1.1 2.8-3.2V3h3.1Z"/></svg>',
    youtube: '<svg viewBox="0 0 24 24" fill="#ff0000"><path d="M23 12s0-3.8-.5-5.6c-.3-1-1-1.7-2-2C18.7 4 12 4 12 4s-6.7 0-8.5.4c-1 .3-1.7 1-2 2C1 8.2 1 12 1 12s0 3.8.5 5.6c.3 1 1 1.7 2 2 1.8.4 8.5.4 8.5.4s6.7 0 8.5-.4c1-.3 1.7-1 2-2 .5-1.8.5-5.6.5-5.6ZM9.8 15.5v-7l6.2 3.5-6.2 3.5Z"/></svg>',
    link: '<svg viewBox="0 0 24 24" fill="none" stroke="var(--muted,#A88E9B)" stroke-width="2"><path d="M10 14a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1.5 1.5"/><path d="M14 10a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7L12.5 19"/></svg>'
  };

  var DB = 'https://zajcglvlzsolygvjeumb.supabase.co/rest/v1/';
  var AK = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InphamNnbHZsenNvbHlndmpldW1iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEyMzI4NjUsImV4cCI6MjEwNjgwODg2NX0.7_Pthb3wPInb5v4o7IoWejozEvDZQgNPS8DgwikQ8ys';
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function escAttr(s) { return esc(s).replace(/"/g, '&quot;'); }

  // 默认清单 = 主页「找到我」当前的静态配置（账号名/ID/链接逐字一致，2026-10-26 实查）；
  // 后台「主页管理」保存过 links 设置时以库里的为准
  var DEFAULT_LINKS = [
    { icon: 'discord', name: 'Discord', sub: '小柚的服务器', url: 'https://discord.gg/aWSfnydGG' },
    { icon: 'tiktok', name: 'TikTok', sub: '账号整理中', url: '' },
    { icon: 'douyin', name: '抖音', sub: '小柚ovo', url: 'https://v.douyin.com/rDWydc4QlBE/' },
    { icon: 'youtube', name: 'YouTube', sub: '账号整理中', url: '' },
    { icon: 'instagram', name: 'Instagram', sub: 'zyc.0119', url: 'https://instagram.com/zyc.0119' },
    { icon: 'wechat', name: '微信', sub: 'yuki_0b0119', url: '' },
    { icon: 'gmail', name: 'Gmail', sub: 'snowyuzustudio', url: 'mailto:snowyuzustudio@gmail.com' },
    { icon: 'x', name: 'X / Twitter', sub: '@yuki_zheng119', url: 'https://x.com/yuki_zheng119' },
    { icon: 'xhs', name: '小红书', sub: '柚y', url: 'https://xhslink.cn/o/8ZUGYxQgnKG' },
    { icon: 'netease', name: '网易云音乐', sub: 'Snow柚', url: 'https://y.music.163.com/m/user?id=5022037817' }
  ];

  window.renderSocialCards = function (boxSel) {
    var box = document.querySelector(boxSel);
    if (!box) return;
    fetch(DB + "site_settings?select=value&key=eq.links", { headers: { 'apikey': AK } })
      .then(function (r) { return r.ok ? r.json() : []; })
      .then(function (rows) {
        var links = [];
        try { links = JSON.parse((rows[0] && rows[0].value) || 'null') || []; } catch (e) {}
        if (!Array.isArray(links) || !links.length) links = DEFAULT_LINKS;
        if (!links.length) {
          box.innerHTML = '<p style="color:var(--muted,#A88E9B);text-align:center;padding:30px 0;">社交账号配置即将上线，先去首页逛逛吧 ♡</p>';
          return;
        }
        box.innerHTML = links.map(function (l) {
          return '<a class="link-card"' + (l.url ? ' href="' + escAttr(l.url) + '" target="_blank" rel="noopener"' : '') + '>' +
            (HOME_ICONS[l.icon] || HOME_ICONS.link) +
            '<span>' + esc(l.name) + (l.sub ? '<small>' + esc(l.sub) + '</small>' : '') + '</span>' +
            '</a>';
        }).join('');
      })
      .catch(function () {
        box.innerHTML = '<p style="color:var(--muted,#A88E9B);text-align:center;padding:30px 0;">加载失败，请刷新重试</p>';
      });
  };
})();
