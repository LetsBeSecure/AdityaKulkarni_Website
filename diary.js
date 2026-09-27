/* Sketch diary: builds the book from the <ol class="diary-data"> list and turns pages. */
(() => {
    "use strict";
    const root = document.querySelector(".diary");
    if (!root) return;

    const items = Array.from(root.querySelectorAll(".diary-data li")).map(li => ({
        src: li.dataset.src,
        title: li.dataset.title || "",
        meta: li.dataset.meta || "",
        meaning: li.dataset.meaning || "",
        ref: li.dataset.ref || "",
        note: li.textContent.trim()
    }));
    const N = items.length;
    if (!N) return;

    const book = root.querySelector(".book");
    const countEl = root.querySelector(".diary-count");
    const playBtn = root.querySelector("[data-diary='play']");
    const INTERVAL = Number(root.dataset.interval) || 4500;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const el = (tag, cls, text) => {
        const e = document.createElement(tag);
        if (cls) e.className = cls;
        if (text) e.textContent = text;
        return e;
    };
    const pad = n => String(n).padStart(2, "0");

    /* ---------- page builders ---------- */
    const descPage = (i) => {
        const page = el("div", "page page-left");
        const d = el("div", "desc");
        d.append(el("span", "d-no", `No. ${pad(i + 1)}`), el("h4", "d-title", items[i].title), el("span", "d-rule"));
                if (items[i].note) d.append(el("p", "d-note", items[i].note.replace(/\s*\n\s*/g, "\n")));
        if (items[i].meaning) d.append(el("p", "d-meaning", items[i].meaning));
        if (items[i].ref) d.append(el("p", "d-ref", items[i].ref));
        if (items[i].meta) d.append(el("p", "d-meta", items[i].meta));
        page.append(d, el("span", "page-no", String(i * 2 + 1)));
        return page;
    };
    const imagePage = (i) => {
        const page = el("div", "page page-right");
        const mount = el("div", "mount");
        const img = el("img");
        img.dataset.src = items[i].src;          // loaded just before it's needed
        img.alt = `Pencil sketch: ${items[i].title}`;
        img.decoding = "async";
        const photo = el("span", "photo");
        photo.append(img);
        mount.append(photo);
        img.addEventListener("load", () => fit(img));
        page.append(mount, el("span", "page-no", String(i * 2 + 2)));
        return page;
    };
    const endPage = () => {
        const page = el("div", "page page-left");
        const e = el("div", "end");
        e.append(el("p", "end-text", root.dataset.endText || "Thank you for turning these pages."));
        if (root.dataset.sign) e.append(el("p", "end-sign", root.dataset.sign));
        page.append(e);
        return page;
    };
    const rewatchPage = () => {
        const page = el("div", "page page-right");
        const e = el("div", "end");
        e.append(el("p", "end-text", "The last page, for now."));
        const btn = el("button", "rewatch");
        btn.type = "button";
        btn.dataset.diary = "rewatch";
        btn.append(el("span", "rewatch-icon", "\u21BB"), document.createTextNode("Click to rewatch"));
        e.append(btn);
        page.append(e);
        return page;
    };

    // size a photo to fit its page without cropping
    const fit = (img) => {
        if (!img.naturalWidth) return;
        const mount = img.closest(".mount");
        const cs = getComputedStyle(mount);
        const aw = mount.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight) - 12;
        const ah = mount.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom) - 12;
        const r = img.naturalWidth / img.naturalHeight;
        const w = Math.max(0, Math.min(aw, ah * r));
        img.style.width = w + "px";
        img.style.height = w / r + "px";
    };
    window.addEventListener("resize", () => book.querySelectorAll(".photo img").forEach(fit));

    /* ---------- build ---------- */
    const base = el("div", "book-base");
    base.append(rewatchPage());
    book.append(base);

    const leaves = [];
    const makeLeaf = (front, back) => {
        const leaf = el("div", "leaf");
        const f = el("div", "face face-front");
        const b = el("div", "face face-back");
        f.append(front);
        b.append(back);
        leaf.append(f, b);
        leaf.addEventListener("transitionend", e => {
            if (e.target !== leaf || e.propertyName !== "transform") return;
            leaf.classList.remove("is-turning");
            restZ(leaves.indexOf(leaf));
        });
        book.append(leaf);
        leaves.push(leaf);
    };

    const coverTpl = root.querySelector("template.diary-cover");
    const cover = el("div", "cover");
    cover.append(coverTpl.content.cloneNode(true));
    makeLeaf(cover, descPage(0));
    for (let i = 0; i < N; i++) makeLeaf(imagePage(i), i < N - 1 ? descPage(i + 1) : endPage());

    const L = leaves.length;                        // N + 1
    let s = 0;                                      // leaves turned so far
    let lift = 0;

    const restZ = (i) => {
        leaves[i].style.zIndex = leaves[i].classList.contains("is-flipped") ? i + 1 : 2 * L - i;
    };
    leaves.forEach((_, i) => restZ(i));

    const loadAround = () => {
        for (let j = s; j <= s + 2 && j < L; j++) {
            const img = leaves[j].querySelector("img[data-src]");
            if (img) { img.src = img.dataset.src; img.removeAttribute("data-src"); }
        }
    };

    const update = () => {
        book.classList.toggle("is-closed", s === 0);
        book.classList.toggle("is-ended", s === L);
        countEl.textContent = s === 0 ? "Cover" : s === L ? "The end" : `${s} / ${N}`;
        loadAround();
    };

    const turn = (i, forward) => {
        const leaf = leaves[i];
        leaf.style.zIndex = 1000 + (++lift);
        leaf.classList.add("is-turning");
        leaf.classList.toggle("is-flipped", forward);
        if (reduceMotion) { leaf.classList.remove("is-turning"); restZ(i); }
    };

    const next = () => {
        if (s >= L) return false;
        turn(s, true); s++; update();
        if (s === L) stop();
        return true;
    };
    const prev = () => {
        if (s <= 0) return;
        s--; turn(s, false); update();
    };

    /* ---------- autoplay ---------- */
    let timer = null, playing = !reduceMotion, hovered = false, inView = false;
    const setPlayIcon = () => {
        if (!playBtn) return;
        playBtn.textContent = playing ? "\u275A\u275A" : "\u25B6";
        playBtn.setAttribute("aria-label", playing ? "Pause page turning" : "Play page turning");
    };
    function stop() { clearInterval(timer); timer = null; }
    const start = () => {
        stop();
        if (!playing || !inView || s >= L) return;
        timer = setInterval(() => { if (!hovered && !document.hidden) next(); }, INTERVAL);
    };
    const userAction = (fn) => { fn(); start(); };   // manual turn resets the countdown

    /* ---------- rewatch ---------- */
    let rewinding = false;
    const rewatch = () => {
        if (rewinding) return;
        rewinding = true;
        stop();
        book.classList.remove("is-ended");
        book.classList.add("is-fast");
        const steps = s;
        for (let k = 0; k < steps; k++) setTimeout(prev, k * 110);
        setTimeout(() => {
            book.classList.remove("is-fast");
            setTimeout(() => {
                rewinding = false;
                playing = true; setPlayIcon();
                next(); start();
            }, 900);
        }, steps * 110 + 600);
    };

    /* ---------- input ---------- */
    root.addEventListener("click", e => {
        const action = e.target.closest("[data-diary]")?.dataset.diary;
        if (action === "rewatch") return rewatch();
        if (action === "next") return userAction(next);
        if (action === "prev") return userAction(prev);
        if (action === "play") { playing = !playing; setPlayIcon(); return start(); }
        if (rewinding || !e.target.closest(".book") || justSwiped) return;
        // click on the book: right half = forward, left half = back
        const r = book.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width;
        if (s === 0 || x >= 0.5) userAction(next); else userAction(prev);
    });

    root.tabIndex = 0;
    root.addEventListener("keydown", e => {
        if (e.key === "ArrowRight") { e.preventDefault(); userAction(next); }
        if (e.key === "ArrowLeft") { e.preventDefault(); userAction(prev); }
    });

    let sx = null, justSwiped = false;
    book.addEventListener("pointerdown", e => { sx = e.clientX; });
    book.addEventListener("pointerup", e => {
        if (sx === null) return;
        const dx = e.clientX - sx; sx = null;
        if (Math.abs(dx) > 40) {
            justSwiped = true; setTimeout(() => { justSwiped = false; }, 0);
            userAction(dx < 0 ? next : prev);
        }
    });

    book.addEventListener("mouseenter", () => { hovered = true; });
    book.addEventListener("mouseleave", () => { hovered = false; });

    // open the cover by itself the first time the diary scrolls into view
    let opened = false;
    const io = new IntersectionObserver(([entry]) => {
        inView = entry.isIntersecting;
        if (inView && !opened && playing) {
            opened = true;
            setTimeout(() => { if (s === 0) next(); start(); }, 1300);
        } else start();
    }, { threshold: 0.45 });
    io.observe(book);

    setPlayIcon();
    update();
})();