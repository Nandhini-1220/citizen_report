document.addEventListener('DOMContentLoaded', () => {
    fetchOverviewMetrics();
    fetchLiveFeed();
    
    // Simulate live feed updates every 5 seconds
    setInterval(fetchLiveFeed, 5000);
});

async function fetchOverviewMetrics() {
    try {
        const response = await fetch('/api/metrics/overview');
        const data = await response.json();
        
        // Update DOM
        document.getElementById('metric-total').textContent = data.total_complaints_today.toLocaleString();
        document.getElementById('metric-resolution').textContent = `${data.avg_resolution_time_hours}h`;
        document.getElementById('metric-escalated').textContent = data.escalated_calls;
        document.getElementById('metric-accuracy').textContent = `${data.ai_routing_accuracy_pct}%`;
        
    } catch (error) {
        console.error("Error fetching overview metrics:", error);
    }
}

async function fetchLiveFeed() {
    try {
        const response = await fetch('/api/feed/live');
        const data = await response.json();
        
        const container = document.getElementById('live-feed-container');
        container.innerHTML = '';
        
        data.forEach(item => {
            const feedItem = document.createElement('div');
            feedItem.className = `feed-item ${item.type}`;
            feedItem.innerHTML = `<strong>Call ID ${item.id}</strong> → ${item.status} - <em>${item.action}</em>`;
            container.appendChild(feedItem);
        });
        
    } catch (error) {
        console.error("Error fetching live feed:", error);
    }
}
