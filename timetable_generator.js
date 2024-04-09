document.addEventListener('DOMContentLoaded', function() {
    const selectedChapters = JSON.parse(localStorage.getItem('selectedChapters')).sort((a, b) => b.difficulty - a.difficulty);
    const selectedDays = parseInt(localStorage.getItem('selectedDays'), 10);
    const dailyStudyMinutes = parseInt(localStorage.getItem('selectedTime'), 10) * 60; // Correctly placed

    // Constants for session management
    const breakDuration = 15; // 15 minutes break after each session
    const maxSessionLength = 90; // Max study session length in minutes before a long break

    // Validate necessary data
    if (!selectedChapters || !selectedDays || !dailyStudyMinutes) {
        console.error('Missing data. Please ensure all selections are made.');
        return;
    }

    // Initialize daily schedules
    const dailySchedules = initializeDailySchedules(selectedDays, dailyStudyMinutes);

    // Distribute chapters across daily schedules, passing dailyStudyMinutes as an argument
    distributeChapters(dailySchedules, selectedChapters, maxSessionLength, dailyStudyMinutes, breakDuration);

    // Generate and download the timetable as a PDF
    generatePDF(dailySchedules, maxSessionLength, breakDuration);
});

function initializeDailySchedules(days, studyMinutes) {
    return Array.from({ length: days }, () => ({ totalTime: 0, sessions: [] }));
}

function distributeChapters(schedules, chapters, maxSessionLength, dailyStudyMinutes, breakDuration) {
    let currentTime = 6 * 60; // Start at 6:00 AM
    chapters.forEach(chapter => {
        const chapterTime = chapter.difficulty * 60; // Convert difficulty to minutes
        let assigned = false;

        for (const schedule of schedules) {
            if (currentTime + chapterTime <= 23 * 60) { // Ensure chapter ends before 11:00 PM
                if (schedule.totalTime + chapterTime <= dailyStudyMinutes) {
                    schedule.sessions.push({ name: chapter.name, duration: Math.min(chapterTime, maxSessionLength), start: currentTime });
                    schedule.totalTime += chapterTime;
                    currentTime += chapterTime + breakDuration;
                    assigned = true;
                    break;
                }
            } else {
                // Reset currentTime for the next day
                currentTime = 6 * 60;
            }
        }

        if (!assigned) {
            let minDay = schedules.reduce((prev, curr) => prev.totalTime < curr.totalTime ? prev : curr);
            minDay.sessions.push({ name: chapter.name, duration: Math.min(chapterTime, maxSessionLength), start: currentTime });
            minDay.totalTime += chapterTime;
            currentTime += chapterTime + breakDuration;
        }
    });
}


function generatePDF(schedules, maxSessionLength, breakDuration) {
    const doc = new jspdf.jsPDF();
    const quotes = [
        "The secret of getting ahead is getting started. – Mark Twain",
        "It always seems impossible until it’s done. – Nelson Mandela",
        "Don’t watch the clock; do what it does. Keep going. – Sam Levenson",
        "Whether you think you can or you think you can’t, you’re right. – Henry Ford",
        "The best time to plant a tree was 20 years ago. The second best time is now. – Chinese Proverb"
    ];

    schedules.forEach((schedule, dayIndex) => {
        if (dayIndex > 0) doc.addPage(); // Start each day's schedule on a new page

        // Set a background color for the header
        doc.setFillColor(224, 235, 255); // Light blue background
        doc.rect(0, 0, doc.internal.pageSize.getWidth(), 30, 'F');

        // Add motivational quote for the day
        doc.setFontSize(10);
        doc.setTextColor(60, 80, 100); // Darker grey color for better readability
        doc.text(quotes[dayIndex % quotes.length], 14, 15);

        // Add a header for each day
        doc.setFontSize(12);
        doc.setTextColor(40, 60, 80); // Dark blue color for the text
        doc.text(`Day ${dayIndex + 1}`, 14, 25);

        let tableData = [];
        // Generate time slots from 06 AM to 11 PM and map chapters to their respective time slots
        for (let hour = 6; hour <= 23; hour++) {
            let timeSlot = {
                'Time Slot': `${formatTime(hour * 60)} - ${formatTime((hour + 1) * 60)}`,
                'Chapter': getChapterForTimeSlot(schedule.sessions, hour * 60, (hour + 1) * 60)
            };
            tableData.push(timeSlot);
        }

        // Generate table for the current day with enhanced styles
        doc.autoTable({
            head: [['Time Slot', 'Chapter']],
            body: tableData.map(obj => Object.values(obj)),
            startY: 35,
            theme: 'striped',
            styles: {
                cellPadding: 3,
                fontSize: 10,
                overflow: 'linebreak',
            },
            headStyles: {
                fillColor: [22, 160, 133], // Attractive header color
                textColor: 255, // White text color
                fontStyle: 'bold',
            },
            alternateRowStyles: {
                fillColor: [240, 240, 240]
            },
        });

        // Add a decorative shape below the table for visual separation
        doc.setDrawColor(100, 100, 100); // Grey line color
        doc.line(14, doc.lastAutoTable.finalY + 5, doc.internal.pageSize.getWidth() - 14, doc.lastAutoTable.finalY + 5);

        // Add progress tracking checklist below the table
        let checklistStartY = doc.lastAutoTable.finalY + 15;
        doc.setFontSize(11);
        doc.setTextColor(120, 20, 40); // Red color for checklist title
        doc.text("Today's Progress Checklist:", 14, checklistStartY);

        // Render checkboxes and session names for the checklist
        schedule.sessions.forEach((session, index) => {
            let checkboxY = checklistStartY + 7 + (index * 7);
            doc.rect(14, checkboxY, 4, 4); // Draw checkbox
            doc.setFontSize(10);
            doc.setTextColor(50, 50, 50); // Dark grey color for text
            doc.text(session.name, 20, checkboxY + 3); // Draw text next to checkbox
        });
    });

    doc.save('StudyTimetable.pdf');
}

// Helper function to find a chapter for a given time slot
function getChapterForTimeSlot(sessions, startTime, endTime) {
    let chapterName = '';
    sessions.forEach(session => {
        if (session.start >= startTime && session.start < endTime) {
            chapterName = session.name;
        }
    });
    return chapterName;
}



function formatTime(minutes) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}
