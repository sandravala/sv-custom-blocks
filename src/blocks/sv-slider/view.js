/**
 * Use this file for JavaScript code that you want to run in the front-end
 * on posts/pages that contain this block.
 *
 * When this file is defined as the value of the `viewScript` property
 * in `block.json` it will be enqueued on the front end of the site.
 *
 * Example:
 *
 * ```js
 * {
 *   "viewScript": "file:./view.js"
 * }
 * ```
 *
 * If you're not making any changes to this file because your project doesn't need any
 * JavaScript running in the front-end, then you should delete this file and remove
 * the `viewScript` property from `block.json`.
 *
 * @see https://developer.wordpress.org/block-editor/reference-guides/block-api/block-metadata/#view-script
 */


document.addEventListener('DOMContentLoaded', () => {
    const sliders = document.querySelectorAll('.wp-block-sv-custom-blocks-sv-slider');
    sliders.forEach((slider) => {
        const autoplay = slider.parentElement.dataset.autoplay === 'true';
        const timeframe = parseInt(slider.parentElement.dataset.timeframe, 10);
        const slideGroup = slider.children[0];
        const slides = Array.from(slideGroup.children);
        // Select navigation buttons for this slider
        const prevButton = slider.parentElement.querySelector('.slider-nav.prev');
        const nextButton = slider.parentElement.querySelector('.slider-nav.next');

        let currentIndex = 0;

        const showSlide = (index) => {
            slides.forEach((slide, i) => {
                slide.classList.add('initial');
                slide.classList.remove('slide-in', 'slide-out'); // Remove previous animations

                if (i === index) {
                    // Active slide slides in
                    slide.classList.add('slide-in');
                    slide.classList.remove('initial');
                    // slide.style.display = 'block'; // Ensure the active slide is visible
                } else if (i === index - 1) {
                    // The previous slide slides out
                    slide.classList.add('slide-out');
                    // slide.style.display = 'block'; // Ensure the outgoing slide remains visible during the transition
                } else {
                    // Hide all other slides
                    //slide.style.display = 'none';
                }
            });
        };
        showSlide(currentIndex);


        if (!autoplay && prevButton && nextButton) {
            prevButton.addEventListener('click', () => {
                currentIndex = (currentIndex - 1 + slides.length) % slides.length; // Move to previous slide
                showSlide(currentIndex);
            });

            nextButton.addEventListener('click', () => {
                currentIndex = (currentIndex + 1) % slides.length; // Move to next slide
                showSlide(currentIndex);
            });
        } else {

            // Recursive function for autoplay
            const cycleSlides = () => {
                // if (!autoplay) return;

                currentIndex = (currentIndex + 1) % slides.length; // Move to the next slide
                showSlide(currentIndex);

                setTimeout(cycleSlides, timeframe); // Schedule the next cycle
            };

            // Initialize the slider
            showSlide(currentIndex);

            // Start autoplay
            if (autoplay) {
                setTimeout(cycleSlides, timeframe);
            }

        }

    });

})

