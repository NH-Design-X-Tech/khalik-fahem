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
  const count = testimonialCarousel.querySelector('.carousel-count');
  const cards = track ? Array.from(track.children) : [];
  const requiredElements = [viewport, track, previousButton, nextButton, count];

  if (requiredElements.every(Boolean) && cards.length > 0) {
    const mobileLayout = window.matchMedia('(max-width: 700px)');
    let index = 0;
    let pointerStartX = null;

    testimonialCarousel.tabIndex = 0;

    const updateCarousel = () => {
      const visibleCount = mobileLayout.matches ? 1 : 3;
      const maxIndex = Math.max(0, cards.length - visibleCount);
      index = Math.max(0, Math.min(index, maxIndex));

      const gap = Number.parseFloat(getComputedStyle(track).columnGap) || 0;
      const cardWidth = cards[0].getBoundingClientRect().width;
      track.style.transform = `translateX(${index * (cardWidth + gap)}px)`;

      cards.forEach((card, cardIndex) => {
        const isVisible = cardIndex >= index && cardIndex < index + visibleCount;
        card.inert = !isVisible;
        card.setAttribute('aria-hidden', String(!isVisible));
      });

      previousButton.disabled = index === 0;
      nextButton.disabled = index === maxIndex;

      const first = cards.length ? index + 1 : 0;
      const last = Math.min(index + visibleCount, cards.length);
      count.textContent = `${first.toLocaleString('ar')}–${last.toLocaleString('ar')} من ${cards.length.toLocaleString('ar')}`;
    };

    previousButton.addEventListener('click', () => {
      index -= 1;
      updateCarousel();
    });

    nextButton.addEventListener('click', () => {
      index += 1;
      updateCarousel();
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
      if (!event.isPrimary || event.target.closest('button') || (event.pointerType === 'mouse' && event.button !== 0)) {
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
      const maxIndex = Math.max(0, cards.length - visibleCount);
      const maxTranslate = maxIndex * dragStep;
      const translate = Math.max(0, Math.min(maxTranslate, dragStartTranslate + (event.clientX - pointerStartX)));
      track.style.transform = `translateX(${translate}px)`;
    });

    const finishDrag = (event) => {
      if (pointerStartX === null) {
        return;
      }

      const translate = dragStartTranslate + (event ? event.clientX - pointerStartX : 0);
      const visibleCount = mobileLayout.matches ? 1 : 3;
      const maxIndex = Math.max(0, cards.length - visibleCount);
      index = Math.max(0, Math.min(maxIndex, Math.round(translate / dragStep)));
      pointerStartX = null;
      viewport.classList.remove('is-dragging');
      track.style.transition = '';
      if (event && viewport.hasPointerCapture && viewport.hasPointerCapture(event.pointerId)) {
        viewport.releasePointerCapture(event.pointerId);
      }
      updateCarousel();
    };

    viewport.addEventListener('pointerup', finishDrag);
    viewport.addEventListener('pointercancel', finishDrag);

    if (mobileLayout.addEventListener) {
      mobileLayout.addEventListener('change', updateCarousel);
    } else {
      mobileLayout.addListener(updateCarousel);
    }

    if ('ResizeObserver' in window) {
      new ResizeObserver(updateCarousel).observe(viewport);
    } else {
      window.addEventListener('resize', updateCarousel, { passive: true });
    }

    updateCarousel();
  }
}
