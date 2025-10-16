// Initialize Celebrities Swiper
document.addEventListener('DOMContentLoaded', function() {
  const celebritiesSwiper = new Swiper('.celebritiesSwiper', {
    // 1 слайд на экран
    slidesPerView: 1,
    spaceBetween: 20,
    
    // Не бесконечный
    loop: false,
    
    // Навигация отключена (по требованию)
    navigation: false,
    
    // Пагинация включена
    pagination: {
      el: '.swiper-pagination',
      clickable: true,
      dynamicBullets: true,
    },
    
    // Автопрокрутка включена
    autoplay: {
      delay: 5000, // 5 секунд
      disableOnInteraction: false, // не останавливать после взаимодействия
      pauseOnMouseEnter: true, // пауза при наведении
    },
    
    // Жесты включены (по умолчанию включены в Swiper)
    touchRatio: 1,
    touchAngle: 45,
    grabCursor: true,
    
    // Эффект плавного перехода
    effect: 'slide',
    speed: 800,
    
    // Настройки для разных экранов
    breakpoints: {
      // На мобильных устройствах
      320: {
        slidesPerView: 1,
        spaceBetween: 10,
      },
      // На планшетах
      768: {
        slidesPerView: 1,
        spaceBetween: 20,
      },
      // На десктопе
      1024: {
        slidesPerView: 1,
        spaceBetween: 30,
      }
    },
    
    // События
    on: {
      init: function () {
        console.log('Celebrities slider initialized');
      },
      slideChange: function () {
        // Паузим все видео при смене слайда
        const videos = document.querySelectorAll('.celebritiesSwiper video');
        videos.forEach(video => {
          video.pause();
        });
      }
    }
  });
});