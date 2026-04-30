gsap.registerPlugin(ScrollTrigger);

// ====== i18n ======
const translations = {
    en: {
        'nav-release': 'Release',
        'nav-about': 'About',
        'hero-pretitle': 'TWIDDLE-AI PRESENTS',
        'hero-subtitle': "World's First Hardware Synthesizer with Natural Language Timbre Control",
        'prototype-title': 'TwiddleSEED',
        'prototype-desc': "TwiddleSEED is the world's first hardware synthesizer with natural language timbre control. As the debut prototype powered by TwiddleAI's self-developed InspirationEngine 1.0, it bridges the gap between words and sound — turning text into playable timbres through an integrated display and responsive MIDI keyboard.",
        'feature-allinone': 'Natural Language Timbre Control',
        'feature-allinone-desc': 'Describe any sound in words and hear it instantly. From technical specifications to poetic metaphors, your language becomes your instrument.',
        'feature-feedback': 'Integrated Display \u0026 Keyboard',
        'feature-feedback-desc': 'A high-resolution screen meets a responsive MIDI keyboard, giving you direct visual and tactile control over every parameter.',
        'feature-portable': 'Portable Creative Hub',
        'feature-portable-desc': 'A compact, all-in-one form factor designed for studios, stages, and everywhere inspiration strikes.',
        'engine-title': 'InspirationEngine 1.0',
        'engine-desc': 'Built on a Transformer architecture, InspirationEngine 1.0 is TwiddleAI\'s end-to-end natural language-to-timbre synthesis algorithm. It translates text into playable sound — from precise professional descriptors like "a bright, gritty, spacious vintage piano" to the poetic inspiration of "I wandered lonely as a cloud / That floats on high o\'er vales and hills." This is not preset browsing. It is timbre creation born from language.',
        'feature-context': 'End-to-End Transformer',
        'feature-context-desc': 'A self-developed neural network that understands both technical sound-design vocabulary and the emotional nuance of free-form language.',
        'feature-style': 'Dual-Mode Language Understanding',
        'feature-style-desc': 'Handles rigorous professional descriptors and open-ended creative metaphors with equal fluency, capturing both precision and inspiration.',
        'feature-collab': 'Real-Time Timbre Synthesis',
        'feature-collab-desc': 'Generate expressive, playable timbres instantaneously. No sampling libraries. No parameter knobs. Just words, transformed into sound.',
        'feature-voice': 'Voice-Guided Incremental Editing',
        'feature-voice-desc': 'Tell TwiddleSEED "make it brighter" or "add more warmth" — the algorithm interprets your voice and refines the timbre in real time, one instruction at a time.',
        'release-desc': 'TwiddleSEED is currently in prototype phase. The product form you see here does not represent the final design — we are actively exploring new interaction paradigms to dissolve the boundary between human and music creation.\u003cbr\u003eThe official release is expected in 2027.\u003cbr\u003eJoin the waitlist to follow our journey.',
        'cta-waitlist': 'Join Waitlist',
        'about-title': 'About TwiddleAI',
        'about-desc': 'TwiddleAI is a team of engineers and musicians pioneering a new paradigm in sound synthesis. Our self-developed InspirationEngine 1.0 algorithm — built on an end-to-end Transformer architecture — bridges natural language and musical expression for the first time. TwiddleSEED is the physical embodiment of this vision: the world\'s first hardware synthesizer that lets you shape sound with nothing but words.',
        'contact': 'Contact',
    },
    zh: {
        'nav-release': '发布日期',
        'nav-about': '关于我们',
        'hero-pretitle': 'TWIDDLE-AI 出品',
        'hero-subtitle': '全球首台支持自然语言音色控制的硬件合成器',
        'prototype-title': 'TwiddleSEED',
        'prototype-desc': 'TwiddleSEED 是全球首台支持自然语言音色控制的硬件合成器。作为 TwiddleAI 自研 InspirationEngine 1.0 的首款原型机，它架起了文字与声音之间的桥梁——通过集成显示屏与响应式 MIDI 键盘，将文本转化为可演奏的音色。',
        'feature-allinone': '自然语言音色控制',
        'feature-allinone-desc': '用文字描述任意声音，即刻听见。从技术参数到诗意隐喻，你的语言就是你的乐器。',
        'feature-feedback': '集成显示屏与键盘',
        'feature-feedback-desc': '高分辨率屏幕配合响应式 MIDI 键盘，为每个参数提供直观的视觉与触觉控制。',
        'feature-portable': '便携式创作中心',
        'feature-portable-desc': '紧凑的一体化设计，适用于录音室、舞台，以及一切灵感迸发的场景。',
        'engine-title': 'InspirationEngine 1.0',
        'engine-desc': 'InspirationEngine 1.0 基于 Transformer 架构，是 TwiddleAI 自研的端到端自然语言到音色合成算法。它将文本转化为可演奏的声音——既能解析精确的专业描述，如"明亮的有颗粒感的强空间感的老式钢琴"，也能捕捉诗意灵感，如"I wandered lonely as a cloud / That floats on high o\'er vales and hills"。这不是预设浏览，而是诞生于语言的音色创造。',
        'feature-context': '端到端 Transformer',
        'feature-context-desc': '自研神经网络，既能理解专业声音设计词汇，也能捕捉自由语言中的情感细腻。',
        'feature-style': '双模式语言理解',
        'feature-style-desc': '严谨的专业描述与开放性的创意隐喻都能流畅解析，兼顾精准与灵感。',
        'feature-collab': '实时音色合成',
        'feature-collab-desc': '即时生成富有表现力的可演奏音色。无需采样库，无需参数旋钮。只需文字，化为声音。',
        'feature-voice': '语音增量编辑',
        'feature-voice-desc': '告诉 TwiddleSEED"让声音更明亮一点"或"增加一些温暖感"——算法会即时理解你的指令，一步一步精细化音色。',
        'release-desc': 'TwiddleSEED 目前处于原型阶段。您所见的产品形态不代表最终设计——我们正在积极探索全新的交互范式，以消融人与音乐创作之间的边界。\u003cbr\u003e正式版本预计于 2027 年发布。\u003cbr\u003e加入等待列表，见证这段旅程。',
        'cta-waitlist': '加入等待列表',
        'about-title': '关于 TwiddleAI',
        'about-desc': 'TwiddleAI 是一支由工程师与音乐人组成的团队，正在开创声音合成的新范式。我们自研的 InspirationEngine 1.0 算法基于端到端 Transformer 架构，首次架起了自然语言与音乐表达之间的桥梁。TwiddleSEED 是这一愿景的物理化身：全球首台让你仅用文字塑造声音的硬件合成器。',
        'contact': '联系我们',
    }
};

let currentLang = 'en';

function setLanguage(lang) {
    currentLang = lang;
    document.documentElement.lang = lang === 'en' ? 'en' : 'zh-CN';

    const els = document.querySelectorAll('[data-i18n]');
    els.forEach((el) => {
        const key = el.getAttribute('data-i18n');
        const text = translations[lang][key];
        if (text !== undefined) {
            if (text.includes('\u003c')) {
                el.innerHTML = text;
            } else {
                el.textContent = text;
            }
        }
    });

    const btn = document.getElementById('langSwitch');
    if (btn) btn.textContent = lang === 'en' ? '中' : 'EN';
}

document.getElementById('langSwitch').addEventListener('click', () => {
    setLanguage(currentLang === 'en' ? 'zh' : 'en');
});

// Initialize default language
setLanguage('en');

// ====== Navbar ======
const navbar = document.querySelector('.navbar');
const hero = document.querySelector('.hero');
const heroBottom = hero.offsetTop + hero.offsetHeight;

window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
        navbar.classList.add('scrolled');
    } else {
        navbar.classList.remove('scrolled');
    }

    if (window.scrollY > heroBottom - 100) {
        navbar.classList.add('on-dark');
    } else {
        navbar.classList.remove('on-dark');
    }
});

// ====== Hero entrance animation ======
const heroTl = gsap.timeline();
heroTl
    .to('.hero-pretitle', { opacity: 1, duration: 0.8, ease: 'power2.out' })
    .to('.hero-title', { opacity: 1, duration: 0.8, ease: 'power2.out' }, '-=0.5');

// ====== Hero pinned scroll animation ======
const heroScrollTl = gsap.timeline({
    scrollTrigger: {
        trigger: '.hero',
        start: 'top top',
        end: '+=300%',
        pin: true,
        scrub: 1,
        onUpdate: (self) => {
            if (self.progress > 0.8) {
                navbar.classList.add('on-dark');
            } else {
                navbar.classList.remove('on-dark');
            }
        }
    }
});

heroScrollTl
    .fromTo('.hero-product',
        { scale: 1, xPercent: 0, opacity: 1 },
        { scale: 22, xPercent: 880, opacity: 1, ease: 'none' }
    )
    .fromTo('.hero-product-glow',
        { opacity: 0.15, scale: 0.8 },
        { opacity: 0.6, scale: 2.5, ease: 'none' },
        0
    )
    .to('.hero-pretitle', { opacity: 0, y: -30, ease: 'none' }, 0.1)
    .to('.hero-title', { opacity: 0, y: -50, ease: 'none' }, 0.15)
    .fromTo('.hero-dark-overlay',
        { opacity: 0 },
        { opacity: 1, ease: 'none' },
        0.75
    );

// ====== Prototype -> Engine transition (single pinned overlay) ======
const engineSection = document.getElementById('engine');
const engineContainer = engineSection.querySelector('.container.split');
const prototypeSection = document.getElementById('prototype');

// Create overlay inside prototype to hold engine content
const engineOverlay = document.createElement('div');
engineOverlay.className = 'engine-overlay';
engineOverlay.style.cssText = 'position:absolute;inset:0;display:flex;align-items:center;justify-content:center;padding:8rem 2rem;z-index:2;background:var(--bg-primary);opacity:0;pointer-events:none;';

// Move engine content into overlay
if (engineContainer) {
    engineOverlay.appendChild(engineContainer);
}
prototypeSection.style.position = 'relative';
prototypeSection.style.overflow = 'hidden';
prototypeSection.appendChild(engineOverlay);

// Hide the real engine section so it doesn't take up space or show duplicates
engineSection.style.cssText = 'height:0;padding:0;overflow:hidden;min-height:0;border:none;';

// Ensure prototype content is visible (it has CSS scroll-reveal initial states)
gsap.set('#prototype > .container h2, #prototype > .container .section-desc, #prototype > .container .feature-item', { opacity: 1, y: 0 });

// Animate prototype out and engine in within one pinned timeline
// Phase A (0 → 1): scroll container vertically so all features become visible
// Phase B (1 → end): original horizontal slide-out + engine slide-in
const prototypeContainer = prototypeSection.querySelector('.container');
const prototypeScrollDistance = () => {
    if (!prototypeContainer) return 0;
    return Math.max(0, prototypeContainer.scrollHeight - window.innerHeight + 40);
};

gsap.timeline({
    scrollTrigger: {
        trigger: '#prototype',
        start: 'top top',
        end: '+=400%',
        pin: true,
        scrub: true,
        invalidateOnRefresh: true,
    }
})
.to('#prototype > .container', { y: () => -prototypeScrollDistance(), ease: 'none', duration: 1 }, 0)
.to('#prototype > .container > *', { x: '-30vw', opacity: 0, stagger: 0.05, ease: 'none' }, 1)
.to('.prototype-img', { x: '50vw', ease: 'none' }, 1)
.to('.engine-overlay', { opacity: 1, pointerEvents: 'auto', ease: 'none' }, 1.25)
.fromTo('.engine-overlay .split-left', { x: '-30vw' }, { x: 0, ease: 'none' }, 1.25)
.fromTo('.engine-overlay .split-right', { x: '50vw' }, { x: 0, ease: 'none' }, 1.25)
.fromTo('.engine-overlay .section-label, .engine-overlay h2, .engine-overlay .section-desc, .engine-overlay .feature-item', { y: 40, opacity: 0 }, { y: 0, opacity: 1, stagger: 0.05, ease: 'none' }, 1.4);

// ====== Waitlist form ======
(function () {
    const input = document.getElementById('waitlistContact');
    const btn = document.getElementById('waitlistSubmit');
    const msg = document.getElementById('waitlistMsg');
    if (!input || !btn || !msg) return;

    // Sanitize: strip HTML tags and trim
    const sanitize = (str) => {
        const div = document.createElement('div');
        div.textContent = String(str).trim();
        return div.innerHTML;
    };

    // Validate email
    const isEmail = (v) => /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(v);

    // Validate phone (international or common formats)
    const isPhone = (v) => /^[\d\s\-+()]{7,20}$/.test(v);

    const showMsg = (text, type) => {
        msg.textContent = text;
        msg.className = 'waitlist-msg ' + (type || '');
    };

    const submit = async () => {
        const raw = input.value.trim();
        if (!raw) {
            showMsg(currentLang === 'zh' ? '请输入邮箱或手机号' : 'Please enter email or phone', 'error');
            return;
        }
        if (raw.length > 128) {
            showMsg(currentLang === 'zh' ? '输入过长' : 'Input too long', 'error');
            return;
        }
        if (!isEmail(raw) && !isPhone(raw)) {
            showMsg(currentLang === 'zh' ? '请输入有效的邮箱或手机号' : 'Please enter a valid email or phone number', 'error');
            return;
        }

        showMsg(currentLang === 'zh' ? '提交中...' : 'Submitting...', '');
        btn.disabled = true;
        input.disabled = true;

        try {
            const r = await fetch('/api/waitlist', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contact: sanitize(raw) }),
            });
            let data = {};
            try { data = await r.json(); } catch { /* ignore */ }
            if (!r.ok) throw new Error(data.error || `HTTP ${r.status}`);
            showMsg(currentLang === 'zh' ? '已加入等待列表，感谢您的关注！' : 'You are on the waitlist. Thank you!', 'success');
            input.value = '';
        } catch (e) {
            showMsg((currentLang === 'zh' ? '提交失败：' : 'Error: ') + e.message, 'error');
        } finally {
            btn.disabled = false;
            input.disabled = false;
        }
    };

    btn.addEventListener('click', submit);
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') submit(); });
})();

// ====== Section reveal animations (skip prototype/engine since they are handled above) ======
gsap.utils.toArray('.section').forEach((section) => {
    if (section.id === 'prototype' || section.id === 'engine') return;

    const elements = section.querySelectorAll('h2, .section-desc, .feature-item, .algo-visual, .release-date, .cta-button, .social-links');

    gsap.to(elements, {
        opacity: 1,
        y: 0,
        duration: 0.8,
        stagger: 0.15,
        ease: 'power3.out',
        scrollTrigger: {
            trigger: section,
            start: 'top 75%',
            toggleActions: 'play none none none',
        }
    });
});
