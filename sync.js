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
          open: cells[2]?.textContent.trim() || '',
          deadline: cells[3]?.textContent.trim() || '',
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

const data = encodeURIComponent(JSON.stringify(homeworks));

const homeworkListURL =
  'https://hung970127.github.io/tnua-homewok--list/?sync=' + data;

alert(
  `同步完成！\n找到 ${uniqueCourses.length} 門課程、${homeworks.length} 個作業。\n\n接下來會回到 TNUA Homework List。`
);

window.location.href = homeworkListURL;
})();
