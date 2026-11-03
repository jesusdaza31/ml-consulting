/* ==========================================
   ML CONSULTING SERVICES — REDESIGN
   script.js
========================================== */

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

document.addEventListener("DOMContentLoaded", () => {

    initPreloader();
    initNavbar();
    initHamburger();
    initScrollSpy();
    initSmoothAnchors();
    initBackToTop();
    initTestimonials();
    initButtonHover();
    initParallax();
    initAuth();
    checkFlash();

});


/* ==========================================
   PRELOADER
========================================== */

function initPreloader() {

    const preloader = document.getElementById("preloader");

    if (!preloader || reduceMotion) {

        startReveals();

        return;

    }

    document.body.classList.add("loading");

    let finished = false;

    const finish = () => {

        if (finished) return;

        finished = true;

        preloader.classList.add("loaded");

        document.body.classList.remove("loading");

        startReveals();

        setTimeout(() => preloader.remove(), 900);

    };

    window.addEventListener("load", finish);

    setTimeout(finish, 2200);

}


/* ==========================================
   REVEAL AL HACER SCROLL
========================================== */

function startReveals() {

    revealElements();

    animateCounters();

}

function revealElements() {

    if (reduceMotion) return;

    const groups = [

        { selector: ".hero-content,.hero-visual", delay: 150 },
        { selector: ".card", delay: 120 },
        { selector: ".stat", delay: 100 },
        { selector: ".contact-card", delay: 120 },
        { selector: ".section-head", delay: 0 },
        { selector: ".about-grid", delay: 100 },
        { selector: ".ceo-grid", delay: 100 },
        { selector: ".timeline-item", delay: 120 },
        { selector: ".slider", delay: 150 }

    ];

    groups.forEach(group => {

        const elements = document.querySelectorAll(group.selector);

        if (!elements.length) return;

        const observer = new IntersectionObserver(entries => {

            entries.forEach(entry => {

                if (!entry.isIntersecting) return;

                const el = entry.target;

                const index = Array.from(el.parentElement.children).indexOf(el);

                setTimeout(() => {

                    el.classList.add("show");

                    setTimeout(() => el.classList.remove("hidden"), 1000);

                }, group.delay * index);

                observer.unobserve(el);

            });

        }, { threshold: .12 });

        elements.forEach(el => {

            if (!el.classList.contains("show")) el.classList.add("hidden");

            observer.observe(el);

        });

    });

}


/* ==========================================
   NAVBAR
========================================== */

function initNavbar() {

    const header = document.querySelector(".header");

    window.addEventListener("scroll", () => {

        if (window.scrollY > 60) {

            header.classList.add("header-scroll");

        } else {

            header.classList.remove("header-scroll");

        }

    });

}


/* ==========================================
   MENÚ MÓVIL (Hamburguesa)
========================================== */

function initHamburger() {

    const hamburger = document.getElementById("hamburger");

    const nav = document.getElementById("nav");

    if (!hamburger || !nav) return;

    const toggleMenu = (open) => {

        hamburger.classList.toggle("open", open);

        nav.classList.toggle("open", open);

        document.body.classList.toggle("menu-open", open);

        hamburger.setAttribute("aria-expanded", String(open));

        hamburger.setAttribute("aria-label", open ? "Cerrar menú" : "Abrir menú");

    };

    hamburger.addEventListener("click", () => {

        toggleMenu(!nav.classList.contains("open"));

    });

    nav.querySelectorAll("a").forEach(link => {

        link.addEventListener("click", () => toggleMenu(false));

    });

    document.addEventListener("click", (e) => {

        if (nav.classList.contains("open") &&
            !nav.contains(e.target) &&
            !hamburger.contains(e.target)) {

            toggleMenu(false);

        }

    });

    document.addEventListener("keydown", (e) => {

        if (e.key === "Escape") toggleMenu(false);

    });

}


/* ==========================================
   SCROLLSPY
========================================== */

function initScrollSpy() {

    const sections = document.querySelectorAll("section[id]");

    const links = document.querySelectorAll('.menu a[href^="#"]');

    const observer = new IntersectionObserver(entries => {

        entries.forEach(entry => {

            if (!entry.isIntersecting) return;

            links.forEach(link => {

                link.classList.toggle("active",

                    link.getAttribute("href") === "#" + entry.target.id);

            });

        });

    }, { rootMargin: "-40% 0px -55% 0px" });

    sections.forEach(section => observer.observe(section));

}


/* ==========================================
   SCROLL SUAVE
========================================== */

function initSmoothAnchors() {

    const links = document.querySelectorAll('a[href^="#"]');

    links.forEach(link => {

        link.addEventListener("click", function (e) {

            const target = document.querySelector(this.getAttribute("href"));

            if (!target) return;

            e.preventDefault();

            target.scrollIntoView({ behavior: "smooth" });

        });

    });

}


/* ==========================================
   CONTADORES ANIMADOS
========================================== */

function animateCounters() {

    const numbers = document.querySelectorAll(".stat-number");

    if (!numbers.length) return;

    if (reduceMotion) {

        numbers.forEach(el => {

            const target = parseInt(el.dataset.target, 10);

            const suffix = el.dataset.suffix || "";

            el.textContent = target.toLocaleString("en-US") + suffix;

        });

        return;

    }

    const observer = new IntersectionObserver(entries => {

        entries.forEach(entry => {

            if (!entry.isIntersecting) return;

            countUp(entry.target);

            observer.unobserve(entry.target);

        });

    }, { threshold: .5 });

    numbers.forEach(number => observer.observe(number));

}

function countUp(el) {

    const target = parseInt(el.dataset.target, 10);

    const base = parseInt(el.dataset.base || "0", 10);

    const suffix = el.dataset.suffix || "";

    const duration = 1900;

    const start = performance.now();

    const tick = (now) => {

        const progress = Math.min((now - start) / duration, 1);

        const eased = 1 - Math.pow(1 - progress, 3);

        const value = Math.round(base + (target - base) * eased);

        el.textContent = value.toLocaleString("en-US") +

            (progress === 1 ? suffix : "");

        if (progress < 1) requestAnimationFrame(tick);

    };

    requestAnimationFrame(tick);

}


/* ==========================================
   TESTIMONIOS SLIDER & MODAL
========================================== */

function getInitials(name) {
    if (!name) return "ML";
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function renderStarsHtml(count) {
    const num = Math.max(1, Math.min(5, parseInt(count, 10) || 5));
    let html = "";
    for (let i = 0; i < num; i++) {
        html += '<i class="fa-solid fa-star"></i>\n';
    }
    return html;
}

function escapeHtml(str) {
    return String(str || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function initTestimonials() {
    const slider = document.getElementById("slider");
    if (!slider) return;

    const track = slider.querySelector(".slides-track");
    const dotsWrap = slider.querySelector(".slider-dots");
    const prev = slider.querySelector(".prev");
    const next = slider.querySelector(".next");

    let current = 0;
    let timer = null;

    function setupSlider() {
        const slides = Array.from(slider.querySelectorAll(".slide"));
        const total = slides.length;
        if (!total) return;

        dotsWrap.innerHTML = "";

        slides.forEach((_, i) => {
            const dot = document.createElement("button");
            dot.className = "dot" + (i === current ? " active" : "");
            dot.setAttribute("aria-label", "Ir al testimonio " + (i + 1));
            dot.addEventListener("click", () => {
                goTo(i);
                restart();
            });
            dotsWrap.appendChild(dot);
        });

        const dots = Array.from(dotsWrap.children);

        function goTo(i) {
            current = (i + total) % total;
            track.style.transform = "translateX(-" + (current * 100) + "%)";
            slides.forEach((_, idx) => {
                if (dots[idx]) {
                    dots[idx].classList.toggle("active", idx === current);
                }
            });
        }

        function restart() {
            clearInterval(timer);
            timer = setInterval(() => goTo(current + 1), 6000);
        }

        // Limpiar handlers previos clonando nodos de control
        const newPrev = prev.cloneNode(true);
        const newNext = next.cloneNode(true);
        prev.parentNode.replaceChild(newPrev, prev);
        next.parentNode.replaceChild(newNext, next);

        newPrev.addEventListener("click", () => {
            goTo(current - 1);
            restart();
        });

        newNext.addEventListener("click", () => {
            goTo(current + 1);
            restart();
        });

        slider.onmouseenter = () => clearInterval(timer);
        slider.onmouseleave = restart;

        goTo(current);
        restart();
    }

    setupSlider();

    // Consultar testimonios aprobados del backend para sincronizar
    fetch("/api/testimonials")
        .then(res => res.ok ? res.json() : null)
        .then(data => {
            if (data && data.ok && Array.isArray(data.testimonials) && data.testimonials.length > 0) {
                // Reconstruir el track con los testimonios aprobados actualizados
                track.innerHTML = "";
                data.testimonials.forEach(t => {
                    const slide = document.createElement("div");
                    slide.className = "slide";
                    slide.innerHTML = `
                        <div class="slide-stars">
                            ${renderStarsHtml(t.rating)}
                        </div>
                        <p>${escapeHtml(t.content)}</p>
                        <div class="slide-author">
                            <span class="author-initial">${escapeHtml(getInitials(t.name))}</span>
                            <div>
                                <strong>${escapeHtml(t.name)}</strong>
                                <small>${escapeHtml(t.service)}</small>
                            </div>
                        </div>
                    `;
                    track.appendChild(slide);
                });
                current = 0;
                setupSlider();
            }
        })
        .catch(() => {
            // Si falla la red, los testimonios iniciales en el HTML permanecen activos
        });

    initTestimonialModalAndForm();
}

function initTestimonialModalAndForm() {
    const modal = document.getElementById("testimonialModal");
    const openBtn = document.getElementById("openTestimonialModalBtn");
    const closeBtn = document.getElementById("closeTestimonialModalBtn");
    const cancelBtn = document.getElementById("cancelTestimonialBtn");
    const overlay = document.getElementById("testimonialModalOverlay");
    const closeSuccessBtn = document.getElementById("closeSuccessBtn");
    const form = document.getElementById("testimonialForm");
    const successState = document.getElementById("testimonialSuccessState");
    const contentTextarea = document.getElementById("testimonialContent");
    const charCount = document.getElementById("charCount");
    const alertBox = document.getElementById("testimonialAlert");

    if (!modal) return;

    function openModal() {
        modal.classList.add("active");
        modal.setAttribute("aria-hidden", "false");
        document.body.style.overflow = "hidden";
        if (form) form.hidden = false;
        if (successState) successState.hidden = true;
        if (alertBox) alertBox.hidden = true;
    }

    function closeModal() {
        modal.classList.remove("active");
        modal.setAttribute("aria-hidden", "true");
        document.body.style.overflow = "";
    }

    if (openBtn) openBtn.addEventListener("click", openModal);
    if (closeBtn) closeBtn.addEventListener("click", closeModal);
    if (cancelBtn) cancelBtn.addEventListener("click", closeModal);
    if (overlay) overlay.addEventListener("click", closeModal);
    if (closeSuccessBtn) closeSuccessBtn.addEventListener("click", closeModal);

    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && modal.classList.contains("active")) {
            closeModal();
        }
    });

    // Rating Picker interactivo
    const ratingPicker = document.getElementById("ratingPicker");
    const ratingValue = document.getElementById("ratingValue");
    const ratingLabel = document.getElementById("ratingLabel");

    const ratingDescriptions = {
        1: "Regular (1 de 5)",
        2: "Aceptable (2 de 5)",
        3: "Bueno (3 de 5)",
        4: "Muy bueno (4 de 5)",
        5: "Excelente (5 de 5)"
    };

    if (ratingPicker && ratingValue) {
        const starBtns = Array.from(ratingPicker.querySelectorAll(".star-btn"));

        function updateStarsVisual(rating) {
            starBtns.forEach(btn => {
                const r = parseInt(btn.dataset.rating, 10);
                btn.classList.toggle("active", r <= rating);
            });
            if (ratingLabel && ratingDescriptions[rating]) {
                ratingLabel.textContent = ratingDescriptions[rating];
            }
        }

        starBtns.forEach(btn => {
            btn.addEventListener("click", () => {
                const r = parseInt(btn.dataset.rating, 10);
                ratingValue.value = r;
                updateStarsVisual(r);
            });

            btn.addEventListener("mouseenter", () => {
                const r = parseInt(btn.dataset.rating, 10);
                updateStarsVisual(r);
            });
        });

        ratingPicker.addEventListener("mouseleave", () => {
            const currentR = parseInt(ratingValue.value, 10) || 5;
            updateStarsVisual(currentR);
        });
    }

    // Contador de caracteres
    if (contentTextarea && charCount) {
        contentTextarea.addEventListener("input", () => {
            charCount.textContent = contentTextarea.value.length + " / 600";
        });
    }

    // Envío del formulario
    if (form) {
        form.addEventListener("submit", async (e) => {
            e.preventDefault();

            const name = document.getElementById("testimonialName")?.value.trim();
            const service = document.getElementById("testimonialService")?.value;
            const content = contentTextarea?.value.trim();
            const rating = parseInt(ratingValue?.value, 10) || 5;

            if (!name || !service || !content) {
                showAlert("Por favor completa todos los campos requeridos.", "error");
                return;
            }

            if (content.length < 10) {
                showAlert("El comentario debe tener al menos 10 caracteres.", "error");
                return;
            }

            const submitBtn = document.getElementById("submitTestimonialBtn");
            const btnText = submitBtn?.querySelector(".btn-text");
            const btnSpinner = submitBtn?.querySelector(".btn-spinner");

            if (submitBtn) submitBtn.disabled = true;
            if (btnText) btnText.hidden = true;
            if (btnSpinner) btnSpinner.hidden = false;
            if (alertBox) alertBox.hidden = true;

            try {
                const response = await fetch("/api/testimonials", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ name, service, content, rating })
                });

                const result = await response.json();

                if (!response.ok || !result.ok) {
                    throw new Error(result.error || "No pudimos enviar tu testimonio. Por favor intenta de nuevo.");
                }

                form.reset();
                if (charCount) charCount.textContent = "0 / 600";
                if (ratingValue) ratingValue.value = "5";
                if (ratingPicker) {
                    const starBtns = Array.from(ratingPicker.querySelectorAll(".star-btn"));
                    starBtns.forEach(btn => btn.classList.add("active"));
                    if (ratingLabel) ratingLabel.textContent = ratingDescriptions[5];
                }

                form.hidden = true;
                if (successState) successState.hidden = false;
            } catch (err) {
                showAlert(err.message, "error");
            } finally {
                if (submitBtn) submitBtn.disabled = false;
                if (btnText) btnText.hidden = false;
                if (btnSpinner) btnSpinner.hidden = true;
            }
        });
    }

    function showAlert(msg, type) {
        if (!alertBox) return;
        alertBox.textContent = msg;
        alertBox.className = "testimonial-alert " + (type || "error");
        alertBox.hidden = false;
    }
}


/* ==========================================
   PARALLAX HERO
========================================== */

function initParallax() {

    if (reduceMotion) return;

    const hero = document.querySelector(".hero");

    const shapes = document.querySelector(".hero-shapes");

    if (!hero || !shapes) return;

    let ticking = false;

    const update = () => {

        const progress = window.scrollY - hero.offsetTop;

        const max = Math.max(hero.offsetHeight * 0.4, 1);

        const p = Math.min(Math.max(progress / max, 0), 1);

        shapes.style.transform = "translate3d(0," + (p * 70) + "px,0)";

        ticking = false;

    };

    window.addEventListener("scroll", () => {

        if (!ticking) {

            ticking = true;

            requestAnimationFrame(update);

        }

    }, { passive: true });

    update();

}


/* ==========================================
   BOTÓN VOLVER ARRIBA
========================================== */

function initBackToTop() {

    const button = document.createElement("button");

    button.innerHTML = '<i class="fa-solid fa-chevron-up"></i>';

    button.className = "back-to-top";

    button.setAttribute("aria-label", "Volver arriba");

    document.body.appendChild(button);

    window.addEventListener("scroll", () => {

        button.classList.toggle("visible", window.scrollY > 500);

    });

    button.addEventListener("click", () => {

        window.scrollTo({ top: 0, behavior: "smooth" });

    });

}


/* ==========================================
   EFECTO BOTONES
========================================== */

function initButtonHover() {

    const buttons = document.querySelectorAll(".btn-primary,.btn-secondary");

    buttons.forEach(button => {

        button.addEventListener("mouseenter", () => {

            button.style.transform = "translateY(-4px) scale(1.02)";

        });

        button.addEventListener("mouseleave", () => {

            button.style.transform = "";

        });

    });

}


/* ==========================================
   AUTENTICACIÓN (sesión desde el backend)
========================================== */

function escapeHtml(value) {

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");

}

function initAuth() {

    const area = document.getElementById("navAuth");

    if (!area) return;

    if (window.location.protocol === "file:") return;

    const token = localStorage.getItem("sb_access_token");
    if (!token) {
        renderAuth(null, []);
        return;
    }

    authFetch("/api/auth/me")
        .then(res => (res && res.ok ? res.json() : Promise.resolve({ user: null, inscripciones: [] })))
        .then(data => renderAuth(data.user || null, data.inscripciones || []))
        .catch(() => { renderAuth(null, []); });

}

function renderAuth(user, inscripciones) {

    const area = document.getElementById("navAuth");

    if (!area) return;

    area.hidden = false;

    area.classList.add("visible");

    if (user) {

        const first = String(user.name || "").split(" ")[0] || "usuario";

        // Con sesión, el CTA de WhatsApp del header se oculta para que
        // el header quede limpio: menú + Hola, Nombre + Mis cursos + Cerrar.
        const cta = document.querySelector(".nav-cta");

        if (cta) cta.style.display = "none";

        let html = '<span class="auth-user">Hola, <strong>' + escapeHtml(first) + '</strong></span>';

        if (user.role === "admin") {

            html += '<a class="auth-admin" href="/admin.html"><i class="fa-solid fa-shield-halved"></i> Admin</a>';

        } else {

            html += '<a class="auth-mis-cursos" href="/mi-cuenta.html"><i class="fa-solid fa-graduation-cap"></i> Mis cursos</a>';

        }

        html += '<button class="auth-logout" id="authLogout"><i class="fa-solid fa-right-from-bracket"></i> Cerrar sesión</button>';

        area.innerHTML = html;

        const btn = document.getElementById("authLogout");

        if (btn) btn.addEventListener("click", logout);

    } else {

        // Sin sesión: el CTA de WhatsApp vuelve a aparecer.
        const cta = document.querySelector(".nav-cta");

        if (cta) cta.style.display = "";

        area.innerHTML = '<a class="auth-link" href="/login.html"><i class="fa-solid fa-user"></i> Iniciar sesión / Registrarse</a>';

    }

}

function logout(e) {

    if (e) e.preventDefault();

    doLogout()
        .catch(() => { /* ignore */ })
        .finally(() => { window.location.href = "/"; });

}


/* ==========================================
   FLASH / TOAST
========================================== */

function showToast(message) {

    let toast = document.getElementById("siteToast");

    if (!toast) {

        toast = document.createElement("div");

        toast.id = "siteToast";

        toast.className = "site-toast";

        document.body.appendChild(toast);

    }

    toast.textContent = message;

    toast.classList.add("show");

    clearTimeout(showToast._timer);

    showToast._timer = setTimeout(() => toast.classList.remove("show"), 3800);

}

function checkFlash() {

    const params = new URLSearchParams(window.location.search);

    if (params.get("login") === "ok") {

        showToast("¡Sesión iniciada correctamente!");

        params.delete("login");

        const clean = params.toString() ? ("?" + params.toString()) : window.location.pathname;

        window.history.replaceState(null, "", clean);

    }

}
