/* Aditya Kulkarni — portfolio interactions. Vanilla JS, no libraries. */
(() => {
    "use strict";
    const $ = (s, root = document) => root.querySelector(s);
    const $$ = (s, root = document) => Array.from(root.querySelectorAll(s));

    /* ---------- Footer year ---------- */
    const yearEl = $("#year");
    if (yearEl) yearEl.textContent = new Date().getFullYear();

    /* ---------- Theme toggle ---------- */
    const themeBtn = $("#theme-toggle");
    const root = document.documentElement;
    const systemDark = window.matchMedia("(prefers-color-scheme: dark)");
    const isDark = () => root.dataset.theme ? root.dataset.theme === "dark" : systemDark.matches;
    const paintThemeIcon = () => {
        themeBtn.innerHTML = isDark()
            ? '<i class="fa-solid fa-sun" aria-hidden="true"></i>'
            : '<i class="fa-solid fa-moon" aria-hidden="true"></i>';
        themeBtn.setAttribute("aria-label", isDark() ? "Switch to light theme" : "Switch to dark theme");
    };
    themeBtn.addEventListener("click", () => {
        root.dataset.theme = isDark() ? "light" : "dark";
        try { localStorage.setItem("theme", root.dataset.theme); } catch (e) { }
        paintThemeIcon();
    });
    systemDark.addEventListener("change", paintThemeIcon);
    paintThemeIcon();

    /* ---------- Mobile menu ---------- */
    const nav = $("#site-nav");
    const menuBtn = $("#menu-toggle");
    const setMenu = (open) => {
        nav.classList.toggle("is-open", open);
        menuBtn.setAttribute("aria-expanded", String(open));
        menuBtn.setAttribute("aria-label", open ? "Close menu" : "Open menu");
        menuBtn.innerHTML = open
            ? '<i class="fa-solid fa-xmark" aria-hidden="true"></i>'
            : '<i class="fa-solid fa-bars" aria-hidden="true"></i>';
    };
    menuBtn.addEventListener("click", () => setMenu(!nav.classList.contains("is-open")));
    $$("a", nav).forEach(a => a.addEventListener("click", () => setMenu(false)));
    document.addEventListener("keydown", e => { if (e.key === "Escape") setMenu(false); });
    document.addEventListener("click", e => {
        if (nav.classList.contains("is-open") && !nav.contains(e.target) && !menuBtn.contains(e.target)) setMenu(false);
    });

    /* ---------- Sketchbook: hide the "coming soon" note once sketches exist ---------- */
    const sketchEmpty = $(".sketch-empty");
    if (sketchEmpty) sketchEmpty.hidden = $$(".sketch").length > 0;
    const sketchRow = $(".sketch-grid");
    $$("[data-strip]").forEach(btn => btn.addEventListener("click", () => {
        sketchRow.scrollBy({ left: Number(btn.dataset.strip) * sketchRow.clientWidth * 0.8 });
    }));
    if (sketchRow && !$$(".sketch").length) $(".sketch-strip").hidden = true;

    /* ---------- Highlight current section in nav ---------- */
    const navLinks = $$(".nav a:not(.nav-cta)");
    const sections = navLinks
        .map(a => document.getElementById(a.getAttribute("href").slice(1)))
        .filter(s => s && !s.hidden);
    if ("IntersectionObserver" in window) {
        const io = new IntersectionObserver(entries => {
            entries.forEach(entry => {
                if (!entry.isIntersecting) return;
                navLinks.forEach(a => a.classList.toggle("is-current",
                    a.getAttribute("href") === "#" + entry.target.id));
            });
        }, { rootMargin: "-45% 0px -50% 0px" });
        sections.forEach(s => io.observe(s));
    }

    /* ---------- Publication year filter ---------- */
    const blocks = $$(".pub-block");
    const pubEmpty = $(".pub-empty");
    const yearChips = $$(".year-filter .chip");

    const applyYear = (year) => {
        let anyShown = false;
        blocks.forEach(block => {
            const items = $$(".pub", block);
            let shown = 0;
            items.forEach(p => {
                const ok = year === "all" || p.dataset.year === year;
                p.hidden = !ok;
                if (ok) shown++;
            });
            $(".pub-count", block).textContent = shown === 1 ? "1 paper" : `${shown} papers`;
            block.hidden = shown === 0;
            if (shown) anyShown = true;
        });
        if (pubEmpty) pubEmpty.hidden = anyShown;
    };

    yearChips.forEach(chip => chip.addEventListener("click", () => {
        yearChips.forEach(c => {
            const on = c === chip;
            c.classList.toggle("is-active", on);
            c.setAttribute("aria-pressed", String(on));
        });
        applyYear(chip.dataset.year);
    }));
    applyYear("all");

    /* ---------- Gallery carousel: endless loop ----------
       Two copies of the last slides sit before the first slide and two copies of the
       first slides sit after the last. When the track lands on a copy, it silently
       jumps to the real slide, so "next" always comes in from the right. */
    $$(".carousel").forEach(carousel => {
        const viewport = $(".carousel-viewport", carousel);
        const track = $(".carousel-track", carousel);
        const real = $$(".slide", track);
        const n = real.length;
        const dotsWrap = $(".carousel-dots", carousel);
        if (n < 2) return;

        const CLONES = 2;
        const makeClone = (slide) => {
            const c = slide.cloneNode(true);
            c.setAttribute("aria-hidden", "true");
            c.dataset.clone = "";
            $$("button", c).forEach(b => { b.tabIndex = -1; b.dataset.clone = ""; });
            return c;
        };
        real.slice(-CLONES).reverse().forEach(s => track.insertBefore(makeClone(s), track.firstChild));
        real.slice(0, CLONES).forEach(s => track.appendChild(makeClone(s)));
        const all = $$(".slide", track);

        const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        let pos = CLONES;                                   // index into `all`
        const realIndex = () => (((pos - CLONES) % n) + n) % n;

        const dots = real.map((_, i) => {
            const b = document.createElement("button");
            b.type = "button";
            b.setAttribute("role", "tab");
            b.setAttribute("aria-label", `Photo ${i + 1} of ${n}`);
            b.addEventListener("click", () => move(i - realIndex()));
            dotsWrap.appendChild(b);
            return b;
        });

        const offsetFor = (i) => all[i].offsetLeft - (viewport.clientWidth - all[i].offsetWidth) / 2;
        const setX = (x, animate) => {
            track.classList.toggle("is-animating", animate && !reduceMotion);
            track.style.transform = `translate3d(${-x}px, 0, 0)`;
        };
        const paint = () => {
            all.forEach((s, i) => s.classList.toggle("is-current", i === pos));
            dots.forEach((d, j) => d.setAttribute("aria-selected", String(j === realIndex())));
        };

        // if we're sitting on a copy, jump (without animation) to the matching real slide
        const normalize = () => {
            if (pos >= CLONES + n) pos -= n;
            else if (pos < CLONES) pos += n;
            else return;
            all.forEach(s => (s.style.transition = "none"));
            setX(offsetFor(pos), false);
            paint();
            void track.offsetWidth;                          // apply instantly
            all.forEach(s => (s.style.transition = ""));
        };

        const move = (step) => {
            normalize();
            pos += step;
            setX(offsetFor(pos), true);
            paint();
            if (reduceMotion) normalize();
        };

        track.addEventListener("transitionend", e => {
            if (e.target === track && e.propertyName === "transform") normalize();
        });

        $$("[data-dir]", carousel).forEach(btn =>
            btn.addEventListener("click", () => move(Number(btn.dataset.dir))));

        viewport.addEventListener("keydown", e => {
            if (e.key === "ArrowRight") { e.preventDefault(); move(1); }
            if (e.key === "ArrowLeft") { e.preventDefault(); move(-1); }
        });

        /* drag / swipe */
        let startX = null, dx = 0, dragging = false, justDragged = false, baseX = 0;
        viewport.addEventListener("pointerdown", e => {
            if (e.button !== 0) return;
            normalize();
            startX = e.clientX; dx = 0; dragging = false;
            baseX = offsetFor(pos);
            paused = true;
        });
        viewport.addEventListener("pointermove", e => {
            if (startX === null) return;
            dx = e.clientX - startX;
            if (!dragging && Math.abs(dx) > 6) {
                dragging = true;
                viewport.classList.add("is-dragging");
                try { viewport.setPointerCapture(e.pointerId); } catch (err) { }
            }
            if (dragging) setX(baseX - dx, false);
        });
        const endDrag = () => {
            if (startX === null) return;
            if (dragging) {
                const threshold = Math.min(80, viewport.clientWidth * 0.15);
                if (dx < -threshold) move(1);
                else if (dx > threshold) move(-1);
                else setX(offsetFor(pos), true);
            }
            justDragged = dragging;
            setTimeout(() => { justDragged = false; }, 0);
            viewport.classList.remove("is-dragging");
            startX = null; dragging = false;
            paused = viewport.matches(":hover");
            start();
        };
        viewport.addEventListener("pointerup", endDrag);
        viewport.addEventListener("pointercancel", endDrag);

        // click on a side (peeking) photo moves to it; click on the centre photo opens it
        viewport.addEventListener("click", e => {
            if (justDragged) { e.preventDefault(); e.stopPropagation(); return; }
            const slide = e.target.closest(".slide");
            if (!slide) return;
            const i = all.indexOf(slide);
            if (i !== pos) { e.preventDefault(); e.stopPropagation(); move(i - pos); }
        }, true);

        window.addEventListener("resize", () => setX(offsetFor(pos), false));
        window.addEventListener("load", () => setX(offsetFor(pos), false));
        setX(offsetFor(pos), false);
        paint();

        /* autoplay every 4 s; pauses on hover, keyboard focus, touch, or hidden tab */
        let timer = null, paused = false;
        function start() {
            if (reduceMotion) return;
            if (timer) clearInterval(timer);
            timer = setInterval(() => { if (!paused && !document.hidden) move(1); }, 4000);
        }
        carousel.addEventListener("mouseenter", () => { paused = true; });
        carousel.addEventListener("mouseleave", () => { paused = false; start(); });
        carousel.addEventListener("focusin", () => { paused = true; });
        carousel.addEventListener("focusout", () => { paused = false; start(); });
        carousel.addEventListener("click", start);
        start();
    });

    /* ---------- Lightbox ---------- */
    const lb = $("#lightbox");
    const lbImg = $("#lightbox-img");
    const lbCap = $("#lightbox-caption");
    let lbItems = [], lbIndex = 0;

    const showLb = (i) => {
        lbIndex = (i + lbItems.length) % lbItems.length;
        const item = lbItems[lbIndex];
        lbImg.src = item.dataset.src;
        lbImg.alt = item.querySelector("img")?.alt || "";
        lbCap.textContent = item.dataset.caption || "";
        const multi = lbItems.length > 1;
        $$(".lb-prev, .lb-next", lb).forEach(b => b.hidden = !multi);
    };

    if (lb && typeof lb.showModal === "function") {
        $$(".zoomable:not([data-clone])").forEach(btn => {
            btn.addEventListener("click", () => {
                lbItems = $$(`.zoomable[data-group="${btn.dataset.group}"]:not([data-clone])`);
                showLb(lbItems.indexOf(btn));
                lb.showModal();
            });
        });
        lb.addEventListener("click", e => {
            const action = e.target.closest("[data-lb]")?.dataset.lb;
            if (action === "close") lb.close();
            else if (action) showLb(lbIndex + Number(action));
            else if (e.target === lb || e.target.classList.contains("lightbox-figure")) lb.close();
        });
        lb.addEventListener("keydown", e => {
            if (e.key === "ArrowRight") showLb(lbIndex + 1);
            if (e.key === "ArrowLeft") showLb(lbIndex - 1);
        });
        // basic swipe inside the lightbox
        let startX = null;
        lb.addEventListener("touchstart", e => { startX = e.touches[0].clientX; }, { passive: true });
        lb.addEventListener("touchend", e => {
            if (startX === null || lbItems.length < 2) return;
            const dx = e.changedTouches[0].clientX - startX;
            if (Math.abs(dx) > 50) showLb(lbIndex + (dx < 0 ? 1 : -1));
            startX = null;
        });
        lb.addEventListener("close", () => { lbImg.src = ""; });
    }

    /* ---------- Back to top ---------- */
    const toTop = $("#to-top");
    const onScroll = () => toTop.classList.toggle("is-visible", window.scrollY > 600);
    window.addEventListener("scroll", onScroll, { passive: true });
    toTop.addEventListener("click", () => window.scrollTo({ top: 0 }));
    onScroll();
})();