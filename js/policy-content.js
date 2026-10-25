/* ═══════════ 政策内容唯一数据源 + 渲染器（FAQ / 退货退款 / 配送 / 隐私 / 条款）═══════════
   window.POLICY_CONTENT：结构化内容（{h2} {p} {p,strong} {ul:[]} {ol:[]}）。
   window.renderPolicyPage(key [, containerId])：渲染进当前页容器（默认 #policy-content）。
   site_settings 覆盖：若库里有 policy_<key>_zh / policy_<key>_en（简单 HTML 字符串），优先渲染它；
   fetch 失败或无数据时用内置默认内容，页面不报错。 */
(function () {
  'use strict';

  var SUPABASE_URL = 'https://zajcglvlzsolygvjeumb.supabase.co';
  // 复用 js/shop-app.js 第 7 行 ANON 变量的同款 anon JWT
  var ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InphamNnbHZsenNvbHlndmpldW1iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEyMzI4NjUsImV4cCI6MjEwNjgwODg2NX0.7_Pthb3wPInb5v4o7IoWejozEvDZQgNPS8DgwikQ8ys';

  // ===== FAQ（问题行双语同时显示，答案按当前语言）=====
  var FAQ = {
    zh: { items: [
      { q: '手工制品是否完全没有瑕疵？', a: '手工制品可能存在轻微的缝线、纹理、尺寸、收边或外观差异。这些合理差异属于手工制作过程中可能出现的正常情况。' },
      { q: '轻微瑕疵可以申请退款吗？', a: '对于与商品描述一致、不影响正常使用且属于合理范围的轻微瑕疵或正常工艺差异，不能仅以这些情况为由申请退款或换货。详情请查看《退货与退款政策》。' },
      { q: '收到商品时发现损坏怎么办？', a: '发现商品损坏后，请尽快联系我们，并提供订单编号及清晰的照片或视频。' },
      { q: '收到错误的商品怎么办？', a: '如果收到的商品与订单不符，请提供订单编号及收到商品的照片。' },
      { q: '配送需要多长时间？', a: '订单处理及配送时间可能因商品、库存、配送方式和目的地而有所不同。请查看商品页面及《配送政策》。' },
      { q: '可以取消订单吗？', a: '如需取消订单，请尽快联系我们。是否可以取消取决于订单状态、制作进度、商品具体条款及适用法律。' },
      { q: '如何联系 SnowYuzu？', a: '请点击网站底部的「联系我们」，进入现有 Contact 页面。' },
      { q: '在哪里可以查看完整的网站政策？', a: '你可以在网站底部查看《退货与退款政策》《配送政策》《隐私政策》和《服务条款》。' }
    ]},
    en: { items: [
      { q: 'Are handmade items perfectly flawless?', a: 'Handmade items may have minor variations in stitching, texture, size, finishing, or appearance. These normal variations are part of the handmade process.' },
      { q: 'Can I request a refund for minor imperfections?', a: 'Minor imperfections and normal production variations that are consistent with the product description are not, by themselves, grounds for a refund or exchange. Please refer to our Return & Refund Policy for details.' },
      { q: 'What if my item arrives damaged?', a: 'Please contact us as soon as reasonably possible and include your order number and clear photos or videos.' },
      { q: 'What if I receive the wrong item?', a: 'Please contact us with your order number and photos of the item received.' },
      { q: 'How long does shipping take?', a: 'Processing and delivery times vary by product, availability, shipping method, and destination. Please check the product page and Shipping Policy.' },
      { q: 'Can I cancel my order?', a: 'Please contact us as soon as possible. Cancellation eligibility depends on the order status, production progress, product-specific terms, and applicable law.' },
      { q: 'How can I contact SnowYuzu?', a: 'Please visit our Contact Us page through the website footer.' },
      { q: 'Where can I read the full store policies?', a: 'Our Return & Refund Policy, Shipping Policy, Privacy Policy, and Terms of Service are available in the website footer.' }
    ]}
  };

  // ===== 退货与退款政策 =====
  var RETURN = {
    zh: { blocks: [
      { h2: '一般政策' },
      { p: '下单前，请仔细阅读商品描述、图片、尺寸及其他相关信息。' },
      { p: '由于本店商品包含手工制品及特殊商品，退货和退款资格可能因商品类型及具体情况而有所不同。' },
      { p: '如需退货，请先联系我们。' },
      { h2: '手工制品' },
      { p: '本店的手工包包、娃娃及其他手工制品均为人工制作。与工业批量生产的商品不同，手工制品在外观、尺寸、纹理、缝线、收边及其他细节方面可能存在轻微差异。' },
      { p: '合理范围内的轻微制作痕迹可能包括：' },
      { ul: ['少量线头或轻微缝线差异。', '细小胶水痕迹或轻微收边痕迹。', '外形、尺寸、纹理或细节位置的轻微差异。', '因材质、拍摄光线或屏幕显示产生的轻微颜色差异。', '其他不实质影响商品正常用途的轻微手工制作痕迹。'] },
      { p: '对于与商品描述一致、不影响正常使用且属于合理范围的手工瑕疵及正常工艺差异，不得仅以这些情况为由申请退货、退款或换货。', strong: true },
      { p: '我们会尽合理努力准确描述商品，并在售前注明已知的重要瑕疵。' },
      { p: '本政策不排除消费者因明显质量缺陷、商品与描述存在重大不符，或其他依法应当获得救济的情况而享有的权利。' },
      { h2: '键帽商品' },
      { p: '键帽可能因材质和制作工艺不同而存在轻微的生产或表面处理差异，例如轻微表面纹理差异、细小制作痕迹或颜色差异。' },
      { p: '如果这些轻微差异符合商品描述及已披露的商品规格，则不能仅以这些差异为由申请退款或换货。' },
      { p: '如果收到的键帽存在明显损坏、错发或实质性质量缺陷，请提供清晰的照片或视频并联系我们，以便核实处理。' },
      { h2: '可申请售后的情况' },
      { p: '如遇以下情况，请及时联系我们：' },
      { ul: ['商品在运输过程中出现明显损坏。', '收到的商品与订单不符。', '商品存在售前未披露的明显质量缺陷。', '实际商品与商品描述存在重大不符。', '其他依法应当获得售后处理的情况。'] },
      { h2: '通常不适用退换货的情况' },
      { p: '除法律另有要求外，以下情况通常不符合退货或退款条件：' },
      { ul: ['本政策所说明的轻微手工瑕疵或正常工艺差异。', '已提前说明或符合商品描述的轻微外观差异。', '在该商品不提供相应退换服务的情况下，因个人喜好或改变购买决定而提出的申请。', '商品送达后因不当使用、处理、存放或自行改造造成的损坏。', '定制或个性化商品，但须遵守适用法律及售前明确告知的具体条款。'] },
      { h2: '如何申请退货或退款' },
      { ol: ['发现问题后，请尽快联系我们。', '提供订单编号及问题描述。', '附上能够清晰展示商品及相关损坏或瑕疵的照片或视频。', '等待我们回复并提供处理指引后，再进行退货操作。'] },
      { h2: '退款处理' },
      { p: '如果退款申请获批，我们会说明适用的退款方式及处理步骤。' },
      { p: '在可行的情况下，退款通常会退回原支付方式。实际到账时间可能取决于支付平台或金融机构的处理速度。' },
      { p: '运费及其他相关费用，将根据已披露的条款、具体退货情况及适用法律处理。' },
      { h2: '联系我们' },
      { p: '如对商品或退换货申请有任何疑问，请前往网站的「联系我们」页面，并尽量提供订单编号。' }
    ]},
    en: { blocks: [
      { h2: 'General Policy' },
      { p: 'Please review all product descriptions, photos, sizes, and details carefully before placing an order.' },
      { p: 'Because our products include handmade items and specialty products, return and refund eligibility may vary depending on the product and the circumstances.' },
      { p: 'Please contact us before returning any item.' },
      { h2: 'Handmade Items' },
      { p: 'Our handmade bags, dolls, and other handmade products are individually crafted. Unlike mass-produced products, handmade items may have small variations in appearance, size, texture, stitching, finishing, or other details.' },
      { p: 'Minor imperfections may include:' },
      { ul: ['Small loose threads or minor stitching variations.', 'Tiny glue marks or minor finishing marks.', 'Small differences in shape, size, texture, or placement.', 'Minor color variations caused by materials, lighting, or screen settings.', 'Other minor handmade characteristics that do not materially affect the item\'s intended use.'] },
      { p: 'Minor imperfections and normal variations inherent to handmade production are not, by themselves, grounds for a return, refund, or exchange.', strong: true },
      { p: 'We will make reasonable efforts to describe products accurately and disclose known significant flaws before purchase.' },
      { p: 'This policy does not exclude applicable consumer rights or remedies for significant defects, items that materially differ from their descriptions, or other circumstances where a remedy is required by law.' },
      { h2: 'Keycap Products' },
      { p: 'Keycaps may have minor manufacturing or finishing variations, depending on the material and production method.' },
      { p: 'These may include minor surface texture differences, small production marks, slight color variations, or other minor cosmetic differences that do not materially affect normal use.' },
      { p: 'Such minor variations, when consistent with the product description and disclosed specifications, are not by themselves grounds for a refund or exchange.' },
      { p: 'If you receive keycaps with significant damage, incorrect items, or a material defect, please contact us with clear photos or videos so we can review the issue.' },
      { h2: 'Eligible Return or Refund Requests' },
      { p: 'Please contact us if:' },
      { ul: ['Your order arrives with significant damage.', 'You receive an incorrect item.', 'The item has a significant defect that was not disclosed.', 'The item materially differs from its product description.', 'Another circumstance qualifies for a remedy under applicable law.'] },
      { h2: 'Non-Returnable Situations' },
      { p: 'Except where otherwise required by law, the following situations generally do not qualify for a return or refund:' },
      { ul: ['Minor handmade imperfections or normal variations described in this policy.', 'Minor cosmetic differences that were disclosed or are consistent with the product description.', 'Change of mind or personal preference where returns are not offered for that product.', 'Damage caused by improper use, handling, storage, or modification after delivery.', 'Customized or personalized products, subject to applicable law and disclosed product-specific terms.'] },
      { h2: 'How to Request a Return or Refund' },
      { ol: ['Contact us as soon as reasonably possible after discovering the issue.', 'Provide your order number and a description of the problem.', 'Include clear photos or videos showing the item and any relevant damage or defect.', 'Wait for our response and instructions before returning the item.'] },
      { h2: 'Refund Processing' },
      { p: 'If a refund is approved, we will explain the applicable refund method and processing steps.' },
      { p: 'Refunds will generally be issued to the original payment method where possible. The time it takes for the funds to appear may depend on the payment provider or financial institution.' },
      { p: 'Shipping costs and other charges will be handled according to the disclosed terms, the circumstances of the return, and applicable law.' },
      { h2: 'Contact Us' },
      { p: 'If you have questions about a product or a return request, please visit our Contact Us page.' },
      { p: 'Please include your order number so we can assist you more efficiently.' }
    ]}
  };

  // ===== 配送政策 =====
  var SHIPPING = {
    zh: { blocks: [
      { h2: '订单处理' },
      { p: '订单将在付款确认后进入处理流程。' },
      { p: '处理时间可能因商品库存、手工制作、定制需求及订单数量而有所不同。具体预计处理时间请以商品页面说明为准。' },
      { h2: '配送方式与预计送达时间' },
      { p: '可用的配送方式、预计送达时间及运费，将根据实际情况显示在结账页面或商品页面。除非另有明确承诺，预计送达时间不构成保证。' },
      { h2: '物流延迟' },
      { p: '天气、节假日、物流承运商运营情况、海关处理或其他超出我们合理控制范围的因素，都可能导致配送延迟。' },
      { h2: '收货地址' },
      { p: '提交订单前，请仔细确认收货地址。如发现地址错误，请尽快联系我们。订单开始处理或已经寄出后，我们无法保证一定能够修改地址。' },
      { h2: '物流追踪' },
      { p: '在可以提供物流追踪信息的情况下，我们会向买家提供相应信息。物流记录可能需要一定时间才会更新。' },
      { h2: '包裹丢失、损坏或错发' },
      { p: '如果包裹疑似丢失、送达时出现损坏，或包裹内商品有误，请提供订单编号、相关照片或物流追踪信息并联系我们。' },
      { p: '我们会核实具体情况并协助处理。本政策不限制消费者依法享有的权利。' },
      { h2: '联系我们' },
      { p: '如有配送相关问题，请前往网站的「联系我们」页面，并提供订单编号。' }
    ]},
    en: { blocks: [
      { h2: 'Order Processing' },
      { p: 'Orders are processed after payment is confirmed.' },
      { p: 'Processing times may vary depending on product availability, handmade production, customization, and order volume. Please refer to the individual product page for estimated processing times.' },
      { h2: 'Shipping Methods and Delivery Estimates' },
      { p: 'Available shipping methods, estimated delivery times, and shipping charges will be displayed during checkout or on the relevant product page where available. Delivery estimates are not guaranteed unless expressly stated otherwise.' },
      { h2: 'Shipping Delays' },
      { p: 'Shipping may be delayed by weather, holidays, carrier operations, customs processing, or other circumstances beyond our reasonable control.' },
      { h2: 'Address Accuracy' },
      { p: 'Please verify your shipping address before completing your order. Contact us as soon as possible if you notice an incorrect address. We cannot guarantee changes after an order has been processed or shipped.' },
      { h2: 'Tracking Information' },
      { p: 'Tracking information will be provided when available. Carrier tracking updates may take time to appear.' },
      { h2: 'Lost, Damaged, or Incorrect Shipments' },
      { p: 'If your package appears lost, arrives damaged, or contains an incorrect item, please contact us with your order number and relevant photos or tracking information.' },
      { p: 'We will review the situation and assist with the next steps. Nothing in this policy limits remedies required by applicable law.' },
      { h2: 'Contact Us' },
      { p: 'For shipping questions, please visit our Contact Us page and include your order number.' }
    ]}
  };

  // ===== 隐私政策 =====
  var PRIVACY = {
    zh: { blocks: [
      { h2: '我们收集的信息' },
      { p: '根据你使用网站的方式，我们可能收集姓名、联系方式、收货及账单信息、订单和交易信息、联系表单提交的内容，以及网站运行和安全维护所需的技术信息。' },
      { h2: '信息使用方式' },
      { p: '我们可能将相关信息用于处理订单、联系买家、提供客户服务、维护网站功能与安全、防范欺诈、履行法律义务，以及在允许的范围内改进服务。' },
      { h2: '付款信息' },
      { p: '付款可能由第三方支付服务商处理。由第三方处理的支付信息，将受其适用的隐私政策及安全措施约束。' },
      { h2: '信息共享' },
      { p: '在运营网店所合理需要的情况下，我们可能与支付处理商、物流承运商、网站托管服务商及数据库或基础设施服务商共享必要信息。法律要求时，也可能依法披露信息。' },
      { h2: 'Cookies 与技术数据' },
      { p: '根据网站实际启用的功能，网站及其服务提供商可能使用 Cookies 或类似技术来维持网站功能、记住用户偏好、分析使用情况或改善安全性。' },
      { h2: '数据安全与保存期限' },
      { p: '我们会采取合理措施保护个人信息，但任何在线服务都无法保证绝对安全。在遵守适用法律及运营要求的前提下，我们仅在合理必要的期限内保存相关信息。' },
      { h2: '你的隐私权利' },
      { p: '根据你的所在地及适用法律，你可能有权要求查阅、更正或删除特定个人信息，或了解相关信息的处理情况。请通过网站的「联系我们」页面提交请求。' },
      { h2: '第三方服务' },
      { p: '第三方网站及服务受其自身政策约束。' },
      { h2: '儿童隐私' },
      { p: '本网站不会故意以违反适用法律的方式收集儿童个人信息。' },
      { h2: '政策更新' },
      { p: '当网站、服务或法律义务发生变化时，我们可能更新本政策。最新版本将在本页面公布。' },
      { h2: '联系我们' },
      { p: '如有隐私相关问题或请求，请前往网站的「联系我们」页面。' }
    ]},
    en: { blocks: [
      { h2: 'Information We Collect' },
      { p: 'Depending on how you use our website, we may collect your name, contact information, shipping and billing details, order and transaction information, contact form submissions, and technical information necessary to operate and secure the website.' },
      { h2: 'How We Use Information' },
      { p: 'We may use information to process orders, communicate with customers, provide support, maintain website functionality and security, prevent fraud, comply with legal obligations, and improve services where permitted.' },
      { h2: 'Payments' },
      { p: 'Payments may be processed by third-party payment providers. Payment information handled by third parties is subject to their applicable privacy policies and security practices.' },
      { h2: 'Sharing of Information' },
      { p: 'We may share relevant information with service providers when reasonably necessary to operate the store, including payment processors, shipping carriers, hosting providers, and database or infrastructure providers. Information may also be disclosed when required by law.' },
      { h2: 'Cookies and Technical Data' },
      { p: 'The website and its service providers may use cookies or similar technologies to maintain functionality, remember preferences, analyze usage, or improve security, depending on enabled features.' },
      { h2: 'Data Security and Retention' },
      { p: 'We take reasonable measures to protect personal information, but no online service can guarantee absolute security. Information is retained as reasonably necessary, subject to applicable legal and operational requirements.' },
      { h2: 'Your Privacy Rights' },
      { p: 'Depending on your location and applicable law, you may have rights to request access to, correction of, deletion of, or information about certain personal data. Please contact us through the Contact Us page.' },
      { h2: 'Third-Party Services' },
      { p: 'Third-party websites and services are governed by their own policies.' },
      { h2: 'Children\'s Privacy' },
      { p: 'Our website is not intended to knowingly collect children\'s personal information in violation of applicable law.' },
      { h2: 'Changes to This Policy' },
      { p: 'We may update this policy when our website, services, or legal obligations change. The latest version will be published on this page.' },
      { h2: 'Contact Us' },
      { p: 'For privacy-related questions or requests, please visit our Contact Us page.' }
    ]}
  };

  // ===== 服务条款 =====
  var TERMS = {
    zh: { blocks: [
      { h2: '同意服务条款' },
      { p: '访问或使用 SnowYuzu 网站，即表示你同意本服务条款及网站公布的其他适用政策。' },
      { h2: '商品信息' },
      { p: '我们会尽合理努力确保商品描述、照片、价格及库存信息准确。商品的颜色和外观可能因光线、屏幕显示、材质及制作工艺而有所差异。' },
      { h2: '手工制品' },
      { p: '手工制品可能在尺寸、形状、纹理、缝线、收边或外观方面存在轻微差异。如果商品符合其描述及已披露的规格，手工制作过程中合理产生的差异不一定构成商品缺陷。' },
      { p: '对于未披露的明显缺陷或商品与描述存在重大不符的情况，我们将根据《退货与退款政策》及适用法律处理。' },
      { h2: '订单与付款' },
      { p: '订单须以付款确认及商品可供销售为前提。如果订单无法履行，我们会联系买家并安排适当的解决方案，包括在适用情况下退款。' },
      { h2: '价格与库存' },
      { p: '商品价格、详情及库存情况可能发生变化。任何变更均不会取消适用法律或现有已确认订单所确立的权利与义务。' },
      { h2: '知识产权' },
      { p: '网站内容，包括原创文字、图形、标志、照片及设计，可能受到知识产权法律保护。第三方品牌及材料仍归各自权利人所有。' },
      { h2: '禁止行为' },
      { p: '不得利用本网站从事违法活动、尝试未经授权的访问、干扰网站正常运行或不当使用其他用户的信息。' },
      { h2: '第三方服务' },
      { p: '网站部分功能可能依赖第三方支付、托管、数据库或物流服务，并受其自身条款约束。' },
      { h2: '责任限制' },
      { p: '在适用法律允许的范围内，对于超出 SnowYuzu 合理控制范围的情况所造成的损失，我们不承担法律禁止以外的责任。本条款不排除或限制法律禁止排除或限制的责任。' },
      { h2: '适用法律' },
      { p: '适用法律及争议解决条款必须符合实际经营所在地和适用法律要求。' },
      { h2: '条款更新' },
      { p: '随着网站及业务的发展，我们可能更新本条款。最新版本将在本页面公布。' },
      { h2: '联系我们' },
      { p: '如对本服务条款有任何疑问，请前往网站的「联系我们」页面。' }
    ]},
    en: { blocks: [
      { h2: 'Agreement to These Terms' },
      { p: 'By accessing or using the SnowYuzu website, you agree to these Terms of Service and applicable policies published on the website.' },
      { h2: 'Product Information' },
      { p: 'We make reasonable efforts to display accurate product descriptions, photos, prices, and availability. Colors and appearance may vary due to lighting, screens, materials, and production methods.' },
      { h2: 'Handmade Products' },
      { p: 'Handmade products may have minor variations in size, shape, texture, stitching, finishing, or appearance. Reasonable variations inherent to handmade production do not necessarily constitute defects when the product remains consistent with its description and disclosed specifications.' },
      { p: 'Significant undisclosed defects or material misrepresentations will be handled in accordance with our Return & Refund Policy and applicable law.' },
      { h2: 'Orders and Payments' },
      { p: 'Orders are subject to payment confirmation and product availability. If an order cannot be fulfilled, we will contact the customer and arrange an appropriate resolution, including a refund when applicable.' },
      { h2: 'Pricing and Availability' },
      { p: 'Prices, product details, and availability may change. Changes will not eliminate rights or obligations established by applicable law or the confirmed terms of an existing order.' },
      { h2: 'Intellectual Property' },
      { p: 'Website content, including original text, graphics, logos, photographs, and designs, may be protected by intellectual property laws. Third-party brands and materials remain the property of their respective owners.' },
      { h2: 'Prohibited Use' },
      { p: 'You may not use the website for unlawful activities, attempt unauthorized access, interfere with website operations, or misuse other users\' information.' },
      { h2: 'Third-Party Services' },
      { p: 'Certain website functions may rely on third-party payment, hosting, database, or shipping services, which may be subject to their own terms.' },
      { h2: 'Limitation of Liability' },
      { p: 'To the extent permitted by applicable law, SnowYuzu is not responsible for losses arising from circumstances beyond its reasonable control. Nothing in these terms excludes or limits liability where prohibited by law.' },
      { h2: 'Governing Law' },
      { p: 'Any governing-law and dispute-resolution provisions must be consistent with the actual business location and applicable legal requirements.' },
      { h2: 'Changes to These Terms' },
      { p: 'We may update these terms as the website and business evolve. The latest version will be published on this page.' },
      { h2: 'Contact Us' },
      { p: 'For questions about these terms, please visit our Contact Us page.' }
    ]}
  };

  window.POLICY_CONTENT = { faq: FAQ, return: RETURN, shipping: SHIPPING, privacy: PRIVACY, terms: TERMS };

  // ===== 小工具 =====
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

  // ===== site_settings 覆盖（fetch 失败/无数据 → 用内置默认，页面不报错）=====
  var SETTINGS_CACHE = null; // { policy_<key>_<lang>: html } 或 {}（失败也为空对象，不再反复请求）
  function fetchOverrides(key) {
    var kZh = 'policy_' + key + '_zh';
    var kEn = 'policy_' + key + '_en';
    if (SETTINGS_CACHE && (kZh in SETTINGS_CACHE || kEn in SETTINGS_CACHE)) return Promise.resolve(SETTINGS_CACHE);
    var url = SUPABASE_URL + '/rest/v1/site_settings?select=key,value&key=in.(' + encodeURIComponent(kZh) + ',' + encodeURIComponent(kEn) + ')';
    return fetch(url, { headers: { 'apikey': ANON, 'Authorization': 'Bearer ' + ANON } })
      .then(function (r) { return r.ok ? r.json() : []; })
      .then(function (rows) {
        var map = SETTINGS_CACHE || {};
        (Array.isArray(rows) ? rows : []).forEach(function (row) {
          if (row && row.key && typeof row.value === 'string') map[row.key] = row.value;
          else if (row && row.key && row.value) map[row.key] = String(row.value);
        });
        SETTINGS_CACHE = map;
        return map;
      })
      .catch(function () {
        if (!SETTINGS_CACHE) SETTINGS_CACHE = {};
        return SETTINGS_CACHE;
      });
  }

  // ===== 结构化内容 → HTML =====
  function renderBlocks(blocks) {
    return (blocks || []).map(function (b) {
      if (b.h2 != null) return '<h2 class="pol-h2">' + esc(b.h2) + '</h2>';
      if (b.p != null) {
        var attrs = b.strong ? ' class="pol-strong"' : '';
        return '<p' + attrs + '>' + esc(b.p) + '</p>';
      }
      if (Array.isArray(b.ul)) return '<ul class="pol-list">' + b.ul.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>';
      if (Array.isArray(b.ol)) return '<ol class="pol-list pol-ol">' + b.ol.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ol>';
      return '';
    }).join('');
  }

  function renderFaq(lang) {
    var data = (POLICY_CONTENT.faq && POLICY_CONTENT.faq[lang]) || POLICY_CONTENT.faq.zh;
    var other = lang === 'en' ? 'zh' : 'en';
    var dataOther = (POLICY_CONTENT.faq && POLICY_CONTENT.faq[other]) || POLICY_CONTENT.faq.zh;
    return (data.items || []).map(function (item, i) {
      var otherItem = (dataOther.items || [])[i] || {};
      var qEn = lang === 'en' ? item.q : (otherItem.q || '');
      var qZh = lang === 'zh' ? item.q : (otherItem.q || '');
      return '<div class="faq-item">' +
        '<button type="button" class="faq-q">' +
          (qEn ? '<span class="faq-q-en">' + esc(qEn) + '</span>' : '') +
          (qZh ? '<span class="faq-q-zh">' + esc(qZh) + '</span>' : '') +
          '<span class="faq-arrow">▾</span>' +
        '</button>' +
        '<div class="faq-a"><p>' + esc(item.a) + '</p></div>' +
        '</div>';
    }).join('');
  }

  // ===== 对外渲染入口 =====
  window.renderPolicyPage = function (key, containerId) {
    var box = document.getElementById(containerId || 'policy-content');
    if (!box) return;
    var lang = currentLang();
    var data = window.POLICY_CONTENT[key];
    if (!data) { box.innerHTML = ''; return; }

    // 1) 先用内置默认内容立即渲染（无闪烁、无网络依赖）
    if (key === 'faq') {
      box.innerHTML = '<div class="faq-list">' + renderFaq(lang) + '</div>';
    } else {
      var langData = data[lang] || data.zh;
      box.innerHTML = '<div class="pol-card">' + renderBlocks(langData.blocks) + '</div>';
    }

    // 2) site_settings 覆盖：有则替换（失败/无数据保持默认）
    fetchOverrides(key).then(function (map) {
      var html = map['policy_' + key + '_' + lang];
      if (typeof html === 'string' && html.trim() !== '') {
        box.innerHTML = '<div class="pol-card pol-custom">' + html + '</div>';
      }
    });
  };

  // FAQ 展开/收起（事件委托，重渲染后依然可用）
  document.addEventListener('click', function (e) {
    var q = e.target && e.target.closest ? e.target.closest('.faq-q') : null;
    if (!q) return;
    var item = q.closest('.faq-item');
    if (item) item.classList.toggle('open');
  });

  // 语言切换时重渲染（延迟 50ms，等页面自身逻辑先跑；site-common 会整页刷新，这里是兜底）
  window.__policyLangBound = (function () {
    document.addEventListener('click', function (e) {
      var btn = e.target && e.target.closest ? e.target.closest('.lang-btn') : null;
      if (!btn || !window.__policyCurrentKey) return;
      setTimeout(function () { window.renderPolicyPage(window.__policyCurrentKey); }, 50);
    });
    return true;
  })();
})();
