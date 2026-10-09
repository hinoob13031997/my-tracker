/* STACK v23.15 — complete compact exercise visual guidance.
   v29.65: the eight technique images were inlined as base64 (≈450 KB parsed on every start);
   they now live in assets/fitness/tech-*-v2315.webp and are precached by sw.js. */
(() => {
  'use strict';
  const T = {
      'squat': [
        'Присед со штангой',
        'Гриф лежит на верхней части спины, корпус собран. Сядь назад и вниз, сохраняя спину нейтральной; колени идут по линии носков.',
        'Не теряй брейсинг и не заваливай колени внутрь.',
      ],
      'bench': [
        'Жим лёжа',
        'Лопатки сведены и прижаты к скамье, стопы устойчивы. Опускай штангу к нижней части груди и выжимай по контролируемой траектории.',
        'Не отбивай гриф от груди и не теряй положение лопаток.',
      ],
      'pulldown': [
        'Тяга верхнего блока',
        'Начни с опускания лопаток, затем тяни рукоять к верхней части груди. Корпус остаётся стабильным.',
        'Не раскачивай корпус и не тяни только руками.',
      ],
      'core': [
        'Корпус · планка',
        'Локти под плечами, корпус — одна прямая линия. Собери рёбра и таз, дыши без потери напряжения.',
        'Не провисай в пояснице и не поднимай таз слишком высоко.',
      ],
      'rdl': [
        'Румынская тяга',
        'Колени мягкие, спина нейтральная. Отводи таз назад и веди вес близко к ногам до натяжения задней поверхности бедра.',
        'Не превращай движение в присед и не округляй спину.',
      ],
      'dbbench': [
        'Жим гантелей лёжа',
        'Лопатки собраны, стопы устойчивы. Опускай гантели контролируемо по сторонам груди и выжимай вверх.',
        'Не опускай локти слишком далеко ниже корпуса при дискомфорте.',
      ],
      'row': [
        'Тяга горизонтального блока',
        'Тяни рукоять к нижним рёбрам, своди лопатки без переразгибания поясницы. Возвращай вес медленно.',
        'Не раскачивайся и не выдвигай голову вперёд.',
      ],
      'dbpress': [
        'Жим гантелей сидя',
        'Корпус и таз устойчивы. Жми гантели вверх в комфортной траектории и контролируй опускание.',
        'Не компенсируй вес сильным прогибом в пояснице.',
      ],
    },
    V = {
      squat: './assets/fitness/tech-squat-v2315.webp',
      bench: './assets/fitness/tech-bench-v2315.webp',
      pulldown: './assets/fitness/tech-pulldown-v2315.webp',
      core: './assets/fitness/tech-core-v2315.webp',
      rdl: './assets/fitness/tech-rdl-v2315.webp',
      dbbench: './assets/fitness/tech-dbbench-v2315.webp',
      row: './assets/fitness/tech-row-v2315.webp',
      dbpress: './assets/fitness/tech-dbpress-v2315.webp',
    };
  const s = document.createElement('style');
  s.textContent =
    '.fx-tech-img{display:block;width:100%;max-height:210px;object-fit:contain;margin:10px 0;border:1px solid #244a64;border-radius:13px;background:#07111c}';
  document.head.appendChild(s);
  document.addEventListener(
    'click',
    e => {
      const b = e.target.closest('[data-info]'),
        id = b?.dataset.info,
        x = T[id];
      if (!x) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      document.getElementById('fxSheet')?.remove();
      const sheet = document.createElement('div');
      sheet.id = 'fxSheet';
      sheet.className = 'fx-sheet';
      sheet.innerHTML =
        '<div><div class="fx-eye">ТЕХНИКА · СТАРТ → ФИНИШ</div><h3>' +
        x[0] +
        '</h3><img class="fx-tech-img" src="' +
        V[id] +
        '" alt="' +
        x[0] +
        ': стартовая и конечная позиция"><p>' +
        x[1] +
        '</p><p class="fx-warn"><b>Избегай:</b> ' +
        x[2] +
        '</p><p class="fx-note">Остановись при резкой боли или необычном дискомфорте.</p><button class="fx-close">ПОНЯТНО</button></div>';
      document.body.appendChild(sheet);
      sheet.onclick = q => {
        if (q.target === sheet || q.target.classList.contains('fx-close')) sheet.remove();
      };
    },
    true
  );
})();
