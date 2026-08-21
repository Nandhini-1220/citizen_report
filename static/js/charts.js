document.addEventListener('DOMContentLoaded', () => {
    initMiniChart();
    initCategoriesChart();
    initSentimentChart();
    initTrendsChart();
    initHeatmap();
});

// Common chart defaults
Chart.defaults.font.family = "'Inter', sans-serif";
Chart.defaults.color = '#718096';

function initMiniChart() {
    const ctx = document.getElementById('miniChart1').getContext('2d');
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['1', '2', '3', '4', '5', '6', '7'],
            datasets: [{
                data: [10, 15, 12, 18, 14, 20, 25],
                borderColor: '#3182ce',
                borderWidth: 2,
                tension: 0.4,
                pointRadius: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false }, tooltip: { enabled: false } },
            scales: { x: { display: false }, y: { display: false } }
        }
    });
}

async function initCategoriesChart() {
    const ctx = document.getElementById('categoriesChart').getContext('2d');
    
    try {
        const response = await fetch('/api/metrics/categories');
        const data = await response.json();
        
        const labels = data.map(d => d.category);
        const withinSLA = data.map(d => d.within_sla);
        const breachedSLA = data.map(d => d.sla_breached);
        
        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Within SLA',
                        data: withinSLA,
                        backgroundColor: '#38a169', // success
                        barPercentage: 0.6
                    },
                    {
                        label: 'SLA Breached',
                        data: breachedSLA,
                        backgroundColor: '#e53e3e', // danger
                        barPercentage: 0.6
                    }
                ]
            },
            options: {
                indexAxis: 'y', // horizontal bar chart
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false } // custom legend in HTML
                },
                scales: {
                    x: { stacked: true, grid: { display: false } },
                    y: { stacked: true, grid: { display: false } }
                }
            }
        });
    } catch (e) {
        console.error("Error fetching category chart data:", e);
    }
}

async function initSentimentChart() {
    const ctx = document.getElementById('sentimentChart').getContext('2d');
    
    try {
        const response = await fetch('/api/metrics/sentiment');
        const data = await response.json();
        
        new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Positive', 'Neutral', 'Negative'],
                datasets: [{
                    data: [data.positive, data.neutral, data.negative],
                    backgroundColor: ['#38a169', '#a0aec0', '#e53e3e'],
                    borderWidth: 0,
                    cutout: '70%'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                }
            }
        });
    } catch (e) {
        console.error("Error fetching sentiment chart data:", e);
    }
}

function initTrendsChart() {
    const ctx = document.getElementById('trendsChart').getContext('2d');
    
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['Day 1', 'Day 2', 'Day 3', 'Day 4', 'Day 5', 'Day 6', 'Day 7'],
            datasets: [
                {
                    label: 'Total calls',
                    data: [50, 120, 70, 60, 130, 75, 90],
                    borderColor: '#3182ce',
                    backgroundColor: 'rgba(49, 130, 206, 0.1)',
                    fill: true,
                    tension: 0.4
                },
                {
                    label: 'AI-resolved',
                    data: [20, 80, 40, 30, 90, 50, 60],
                    borderColor: '#38a169',
                    backgroundColor: 'rgba(56, 161, 105, 0.1)',
                    fill: true,
                    tension: 0.4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: { beginAtZero: true, grid: { borderDash: [2, 4] } },
                x: { grid: { display: false } }
            }
        }
    });
}

function initHeatmap() {
    // Initialize map
    const map = L.map('heatmap', {
        zoomControl: true,
        attributionControl: false
    }).setView([40.7128, -74.0060], 12); // NYC roughly

    // Add light base map
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        subdomains: 'abcd',
        maxZoom: 19
    }).addTo(map);

    // Mock heatmap data
    const addressPoints = [
        [40.7128, -74.0060, "1"],
        [40.7138, -74.0070, "1"],
        [40.7228, -73.9960, "1"],
        [40.7328, -73.9860, "1"],
        [40.7028, -74.0160, "1"],
        [40.7428, -73.9760, "1"],
        // Cluster some points to make red zones
        ...Array(50).fill([40.7128, -74.0060, "1"].map((v, i) => i < 2 ? v + (Math.random() - 0.5) * 0.02 : "1")),
        ...Array(30).fill([40.7328, -73.9860, "1"].map((v, i) => i < 2 ? v + (Math.random() - 0.5) * 0.02 : "1")),
        ...Array(40).fill([40.7028, -74.0160, "1"].map((v, i) => i < 2 ? v + (Math.random() - 0.5) * 0.02 : "1")),
    ];

    // Convert to Leaflet heat map format [lat, lng, intensity]
    const heatData = addressPoints.map(p => [p[0], p[1], 0.5]);

    L.heatLayer(heatData, {
        radius: 25,
        blur: 15,
        maxZoom: 15,
        gradient: {0.4: 'green', 0.65: 'yellow', 1: 'red'}
    }).addTo(map);
}
