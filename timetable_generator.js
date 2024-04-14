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
    const doc = new jspdf.jsPDF();
    doc.setFont("helvetica", "bold"); // Set a universal bold font for headings
    const quotes = [
        "The secret of getting ahead is getting started. – Mark Twain",
        "It always seems impossible until it’s done. – Nelson Mandela",
        "Don’t watch the clock; do what it does. Keep going. – Sam Levenson",
        "Whether you think you can or you think you can’t, you’re right. – Henry Ford",
        "The best time to plant a tree was 20 years ago. The second best time is now. – Chinese Proverb"
    ];

    schedules.forEach((schedule, dayIndex) => {
        if (dayIndex > 0) doc.addPage();
        doc.setFontSize(16);
        doc.setTextColor(60, 80, 100);
        doc.text(`Day ${dayIndex + 1} Schedule`, 14, 20);
        doc.setFontSize(11);
        doc.setTextColor(100, 20, 20); // Set text color for motivational quote
        doc.text(quotes[dayIndex % quotes.length], 14, 30);

        let yPosition = 40;
        doc.setFont("courier"); // Use a different font for session details for variety
        schedule.sessions.forEach(session => {
            doc.setFontSize(10);
            doc.setTextColor(0); // Default black text
            const sessionInfo = `${session.name} - ${session.duration} minutes (${session.type})`;
            doc.text(sessionInfo, 14, yPosition);
            yPosition += 10;
            if (yPosition > 250) {  // Adjust yPosition to ensure space for checklist
                doc.addPage();
                yPosition = 10;
            }
        });

        // Adding a checklist at the bottom of each page
        let checklistStartY = 260; // Start position for checklist
        doc.setFontSize(12);
        doc.setTextColor(0, 0, 255); // Blue text color for checklist heading
        doc.text('Today’s Topics Checklist:', 14, checklistStartY);
        checklistStartY += 10;

        schedule.sessions.forEach(session => {
            doc.setFontSize(10);
            doc.setTextColor(0);
            doc.text(`[ ] ${session.name}`, 14, checklistStartY);
            checklistStartY += 10;
        });
    });

    doc.save('StudyTimetable.pdf');
}
