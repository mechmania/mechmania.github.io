const API_BASE = "https://api-mechmania.duckdns.org";

// adjust length before truncating
const TEAM_NAME_TRUNCATE_LENGTH = 20;

async function loadLeaderboard() {
  try {
    const res = await fetch(`${API_BASE}/rankings`);
    const data = await res.json();

    //Test empty leaderboard:
    //data.rankings = [];

    const tbody = document.querySelector("#leaderboard tbody");
    tbody.innerHTML = "";

    if (!data.rankings || data.rankings.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" class="text-center text-muted py-4 bg-light fw-normal">
            <i class="fas fa-search me-2"></i>
            No leaderboard entries found
          </td>
        </tr>
      `;
      return;
    }

    data.rankings.forEach(team => {
      const truncatedName =
        team.team_username.length > TEAM_NAME_TRUNCATE_LENGTH
          ? team.team_username.substring(0, TEAM_NAME_TRUNCATE_LENGTH) + "..."
          : team.team_username;

      const row = `
            <tr>
              <td>${team.rank}</td>
              <td>
                <span title="${team.team_username}">
                  ${truncatedName}
                </span>
              </td>
              <td>${team.score}</td>
              <td>${team.matches_played}</td>
              <td>${team.wins}</td>
              <td>${team.losses}</td>
              <td>${team.ties}</td>
            </tr>
          `;

      tbody.insertAdjacentHTML("beforeend", row);
    });
  } catch (err) {
    console.error("Failed to load rankings:", err);
  }
}

// load once when page opens
loadLeaderboard();

// auto-refresh (every 30s)
setInterval(loadLeaderboard, 30000);
