document.addEventListener('DOMContentLoaded', function() {
    const selectedChapters = JSON.parse(localStorage.getItem('selectedChapters')).sort((a, b) => b.difficulty - a.difficulty);
    const selectedDays = parseInt(localStorage.getItem('selectedDays'), 10);
    const dailyStudyMinutes = parseInt(localStorage.getItem('selectedTime'), 10) * 60;

    if (!selectedChapters || !selectedDays || !dailyStudyMinutes) {
        console.error('Missing data. Please ensure all selections are made.');
        return;
    }

    const schedules = initializeDailySchedules(selectedDays, dailyStudyMinutes);
    distributeChapters(schedules, selectedChapters, dailyStudyMinutes);
    generatePDF(schedules);
});

function initializeDailySchedules(days, studyMinutes) {
    return Array.from({ length: days }, () => ({ totalTime: 0, sessions: [] }));
}

function calculateChapterTime(difficulty) {
    const baseTime = 45; // Base time for the simplest subject
    return baseTime + (difficulty * 15); // Increase time for each level of difficulty
}

function distributeChapters(schedules, chapters, dailyStudyMinutes) {
    let dayIndex = 0;
    chapters.forEach(chapter => {
        const chapterTime = calculateChapterTime(chapter.difficulty);
        const session = {
            name: chapter.name,
            duration: chapterTime,
            difficulty: chapter.difficulty,
            type: 'Study'
        };

        // Find a schedule day with enough remaining time
        while (dayIndex < schedules.length && schedules[dayIndex].totalTime + chapterTime > dailyStudyMinutes) {
            dayIndex++; // Move to the next day if current day is full
        }

        if (dayIndex < schedules.length) {
            schedules[dayIndex].sessions.push(session);
            schedules[dayIndex].totalTime += chapterTime;
        }
    });

    // Add revision sessions at the end of each day based on the sessions of that day
    schedules.forEach(schedule => {
        schedule.sessions.forEach(session => {
            schedule.sessions.push({
                name: `Revision: ${session.name}`,
                duration: Math.round(session.duration * 0.5), // Half the duration of the original session
                difficulty: session.difficulty,
                type: 'Revision'
            });
        });
    });
}

function generatePDF(schedules) {
    const doc = new jspdf.jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
    });

    doc.setFont("helvetica", "bold");
    const quotes = [
        "The secret of getting ahead is getting started. – Mark Twain",
        "It always seems impossible until it’s done. – Nelson Mandela",
        "Don’t watch the clock; do what it does. Keep going. – Sam Levenson",
        "Whether you think you can or you think you can’t, you’re right. – Henry Ford",
        "The best time to plant a tree was 20 years ago. The second best time is now. – Chinese Proverb"
    ];

    schedules.forEach((schedule, dayIndex) => {
        if (dayIndex > 0) doc.addPage();

        // Set a light gray background for each page
        doc.setFillColor(245, 245, 245); // Light gray
        doc.rect(0, 0, 210, 297, 'F');

        doc.setTextColor(120, 20, 40); // Deep red
        doc.setFontSize(16);
        doc.text(`Day ${dayIndex + 1} Schedule`, 14, 20);
        doc.setFontSize(11);
        doc.setTextColor(60, 80, 100); // Dark grey for quote
        doc.text(quotes[dayIndex % quotes.length], 14, 30);

        // Prepare data for the table
        const bodyRows = schedule.sessions.map(sess => [
            { content: sess.name, styles: { halign: 'left' } },
            { content: `${sess.duration} mins`, styles: { halign: 'center' } },
            { content: sess.type, styles: { halign: 'center' } }
        ]);

        doc.autoTable({
            startY: 40,
            head: [['Session', 'Duration', 'Type']],
            body: bodyRows,
            theme: 'grid',
            styles: { fontSize: 10, font: 'courier' },
            headStyles: { fillColor: [22, 160, 133], textColor: 255 },
            columnStyles: {
                0: { cellWidth: 100 },
                1: { cellWidth: 45 },
                2: { cellWidth: 45 }
            },
            didDrawPage: function(data) {
                // Checklist at the bottom
                doc.setTextColor(40, 120, 180); // Soft blue for checklist header
                doc.setFontSize(12);
                doc.text('Today’s Topics Checklist:', 14, data.cursor.y + 10);
                let checklistY = data.cursor.y + 20;
                schedule.sessions.forEach(sess => {
                    doc.setFontSize(10);
                    doc.setTextColor(80, 80, 80); // Gray text for checklist items
                    doc.text(`[ ] ${sess.name}`, 14, checklistY);
                    checklistY += 10;
                });
            }
        });
    });

    doc.save('StudyTimetable.pdf');
}