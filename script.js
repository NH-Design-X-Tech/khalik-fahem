'use strict';

const year = document.getElementById('year');

if (year) {
  year.textContent = new Date().getFullYear();
}

const testimonialCarousel = document.querySelector('.testimonial-carousel');

if (testimonialCarousel) {
  const viewport = testimonialCarousel.querySelector('.cards-viewport');
  const track = testimonialCarousel.querySelector('.cards');
  const previousButton = testimonialCarousel.querySelector('[data-carousel-prev]');
  const nextButton = testimonialCarousel.querySelector('[data-carousel-next]');
  const status = testimonialCarousel.querySelector('.carousel-status');
  const dots = testimonialCarousel.querySelector('.carousel-dots');
  const cards = track ? Array.from(track.children) : [];
  const requiredElements = [viewport, track, previousButton, nextButton, status, dots];

  if (requiredElements.every(Boolean) && cards.length > 0) {
    const mobileLayout = window.matchMedia('(max-width: 700px)');
    let index = 0;
    let pointerStartX = null;
    let wrapping = false;
    let wrapTimer = null;

    // Continue forward into a duplicate first cards, then reset invisibly.
    cards.slice(0, 3).forEach((card) => {
      const clone = card.cloneNode(true);
      clone.inert = true;
      clone.setAttribute('aria-hidden', 'true');
      clone.removeAttribute('id');
      clone.querySelectorAll('[id]').forEach((element) => element.removeAttribute('id'));
      track.appendChild(clone);
    });

    testimonialCarousel.tabIndex = 0;

    const updateCarousel = (visualIndex = null) => {
      const visibleCount = mobileLayout.matches ? 1 : 3;
      const maxIndex = cards.length > visibleCount ? cards.length - 1 : 0;
      index = Math.max(0, Math.min(index, maxIndex));

      const gap = Number.parseFloat(getComputedStyle(track).columnGap) || 0;
      const cardWidth = cards[0].getBoundingClientRect().width;
      track.style.transform = `translateX(${(visualIndex ?? index) * (cardWidth + gap)}px)`;

      cards.forEach((card, cardIndex) => {
        const isVisible = (cardIndex - index + cards.length) % cards.length < visibleCount;
        card.inert = !isVisible;
        card.setAttribute('aria-hidden', String(!isVisible));
      });

      previousButton.disabled = index === 0;
      nextButton.disabled = maxIndex === 0;

      const visiblePositions = Array.from({ length: Math.min(visibleCount, cards.length) },
        (_, offset) => ((index + offset) % cards.length + 1).toLocaleString('ar'));
      // One indicator for each reachable carousel position, in RTL order.
      if (dots.children.length !== maxIndex + 1) {
        dots.replaceChildren();
        for (let position = 0; position <= maxIndex; position += 1) {
          const dot = document.createElement('span');
          dot.className = 'carousel-dot';
          dots.appendChild(dot);
        }
      }
      Array.from(dots.children).forEach((dot, position) => {
        dot.classList.toggle('is-active', position === index);
      });

      status.textContent = `${visiblePositions.join('، ')} من ${cards.length.toLocaleString('ar')}`;
    };

    const finishWrap = () => {
      if (!wrapping) return;
      wrapping = false;
      clearTimeout(wrapTimer);
      track.style.transition = 'none';
      updateCarousel();
      track.getBoundingClientRect(); // Commit the invisible reset before restoring animation.
      track.style.transition = '';
    };

    const wrapForward = () => {
      wrapping = true;
      index = 0;
      updateCarousel(cards.length);
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        finishWrap();
      } else {
        wrapTimer = setTimeout(finishWrap, 500);
      }
    };

    track.addEventListener('transitionend', (event) => {
      if (event.target === track && event.propertyName === 'transform') finishWrap();
    });

    previousButton.addEventListener('click', () => {
      if (wrapping) return;
      index -= 1;
      updateCarousel();
    });

    nextButton.addEventListener('click', () => {
      if (wrapping) return;
      const visibleCount = mobileLayout.matches ? 1 : 3;
      const maxIndex = cards.length > visibleCount ? cards.length - 1 : 0;
      if (maxIndex > 0 && index === maxIndex) {
        wrapForward();
      } else {
        index += 1;
        updateCarousel();
      }
    });

    testimonialCarousel.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        nextButton.click();
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        previousButton.click();
      }
    });

    let dragStartTranslate = 0;
    let dragStep = 0;

    viewport.addEventListener('pointerdown', (event) => {
      if (wrapping || !event.isPrimary || event.target.closest('button') || (event.pointerType === 'mouse' && event.button !== 0)) {
        return;
      }

      const gap = Number.parseFloat(getComputedStyle(track).columnGap) || 0;
      dragStep = cards[0].getBoundingClientRect().width + gap;
      if (!dragStep) {
        return;
      }

      pointerStartX = event.clientX;
      dragStartTranslate = index * dragStep;
      track.style.transition = 'none';
      viewport.classList.add('is-dragging');
      if (viewport.setPointerCapture) {
        viewport.setPointerCapture(event.pointerId);
      }
    });

    viewport.addEventListener('pointermove', (event) => {
      if (pointerStartX === null) {
        return;
      }

      const visibleCount = mobileLayout.matches ? 1 : 3;
      const maxIndex = cards.length > visibleCount ? cards.length - 1 : 0;
      const maxTranslate = (index === maxIndex && maxIndex > 0 ? cards.length : maxIndex) * dragStep;
      const translate = Math.max(0, Math.min(maxTranslate, dragStartTranslate + (event.clientX - pointerStartX)));
      track.style.transform = `translateX(${translate}px)`;
    });

    const finishDrag = (event) => {
      if (pointerStartX === null) {
        return;
      }

      const translate = dragStartTranslate + (event ? event.clientX - pointerStartX : 0);
      const visibleCount = mobileLayout.matches ? 1 : 3;
      const maxIndex = cards.length > visibleCount ? cards.length - 1 : 0;
      const requestedIndex = Math.round(translate / dragStep);
      const shouldWrap = maxIndex > 0 && index === maxIndex && requestedIndex > maxIndex;
      if (!shouldWrap) index = Math.max(0, Math.min(maxIndex, requestedIndex));
      pointerStartX = null;
      viewport.classList.remove('is-dragging');
      track.style.transition = '';
      if (event && viewport.hasPointerCapture && viewport.hasPointerCapture(event.pointerId)) {
        viewport.releasePointerCapture(event.pointerId);
      }
      if (shouldWrap) wrapForward();
      else updateCarousel();
    };

    viewport.addEventListener('pointerup', finishDrag);
    viewport.addEventListener('pointercancel', () => finishDrag(null));

    const resizeCarousel = () => {
      finishWrap();
      updateCarousel();
    };

    if (mobileLayout.addEventListener) {
      mobileLayout.addEventListener('change', resizeCarousel);
    } else {
      mobileLayout.addListener(resizeCarousel);
    }

    if ('ResizeObserver' in window) {
      new ResizeObserver(resizeCarousel).observe(viewport);
    } else {
      window.addEventListener('resize', resizeCarousel, { passive: true });
    }

    updateCarousel();
  }
}
