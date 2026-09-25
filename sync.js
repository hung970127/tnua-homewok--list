(async () => {
  alert('正在同步新藝學園作業…');

  // 取得目前帳號的課程
  const courses = [...document.querySelectorAll('a[href*="/course/"]')]
    .map(a => {
      const match = a.getAttribute('href')?.match(/\/course\/(\d+)/);

      if (!match) return null;

      return {
        id: match[1],
        name: a.textContent.trim()
      };
    })
    .filter(Boolean);

  const uniqueCourses = [
    ...new Map(courses.map(course => [course.id, course])).values()
  ];

  const homeworks = [];

  // 逐門課取得作業
  for (const course of uniqueCourses) {
    try {
      const response = await fetch(`/course/homeworkList/${course.id}`);
      const html = await response.text();

      const doc = new DOMParser().parseFromString(html, 'text/html');

      const rows = doc.querySelectorAll('#homeworkListTable tbody tr');

      rows.forEach(row => {
        const link = row.querySelector('a[href*="/course/homework/"]');

        if (!link) return;

        const cells = row.querySelectorAll('td');

        const match = link
          .getAttribute('href')
          ?.match(/\/course\/homework\/(\d+)/);

        if (!match) return;

        const submitted =
          !!row.querySelector('.fa-check') ||
          row.textContent.includes('已繳交');

        homeworks.push({
          id: match[1],
          course: course.name,
          name: link.textContent.trim(),
        open: cells[4]?.textContent.trim() || '',
deadline: cells[5]?.textContent.trim() || '',
year: new Date().getFullYear(),
submitted,
          url: `https://eclass.tnua.edu.tw/course/homework/${match[1]}`
        });
      });

    } catch (error) {
      console.error(`讀取 ${course.name} 失敗：`, error);
    }
  }

  console.log('TNUA HOMEWORK DATA:', homeworks);

 window.TNUA_HOMEWORKS = homeworks;

if (window.opener) {
  window.opener.postMessage(
    {
      type: 'TNUA_HOMEWORK_SYNC',
      homeworks: homeworks
    },
    'https://hung970127.github.io'
  );

  const overlay = document.createElement('div');

overlay.innerHTML = `
  <div style="
    background: white;
    padding: 28px 32px;
    border-radius: 18px;
    text-align: center;
    box-shadow: 0 15px 50px rgba(0,0,0,.25);
    font-family: -apple-system, BlinkMacSystemFont, sans-serif;
  ">
    <div style="
      font-size: 22px;
      font-weight: 700;
      margin-bottom: 8px;
      color: #111;
    ">
      ✓ 同步完成
    </div>

    <div style="
      font-size: 14px;
      color: #777;
      margin-bottom: 20px;
    ">
      已同步 ${homeworks.length} 個作業
    </div>

    <button id="tnuaReturnButton" style="
      border: none;
      border-radius: 10px;
      padding: 12px 20px;
      background: #111;
      color: white;
      font-size: 15px;
      font-weight: 600;
      cursor: pointer;
    ">
      返回 Homework List
    </button>
  </div>
`;

Object.assign(overlay.style, {
  position: 'fixed',
  inset: '0',
  zIndex: '2147483647',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'rgba(0,0,0,.35)'
});

document.documentElement.appendChild(overlay);

overlay
  .querySelector('#tnuaReturnButton')
  .addEventListener('click', () => {
    window.opener.focus();
    window.close();
  });

} else {
  alert(
    '找不到 TNUA Homework List。\n請從 TNUA Homework List 按「連結新藝學園」後再同步。'
  );
}

})();
