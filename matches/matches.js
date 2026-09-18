let currentPage = 0;
const matchesPerPage = 15;  // don't make this more than 99, trust me pls
const TEAM_NAME_TRUNCATE_LENGTH = 20;   // idk if it looks nice it looks nice
let totalMatches = 0;
let hasNextPage = false;

// Toggle this to switch between preview (sample data) and prod
// preview mode makes no api calls
const USE_SAMPLE_DATA = false;

// `?api=http://localhost:8080` points the page at a local mm-dev stack, which is how the
// backend's mm-simulate run is verified end to end. Production is the default.
const API_BASE_URL = new URLSearchParams(location.search).get('api')
    || 'https://api-mechmania.duckdns.org';

// Store unique team names for winner filter
let allTeamNames = new Set();

// Sample data for demonstration
const sampleMatches = [
    {
        id: 1,
        teama_name: "AlphaTeam",
        teama_version: 2,
        teamb_name: "BetaBots",
        teamb_version: 1,
        winner_name: "AlphaTeam",
        tourney: 1,
        run_status: "success",
        has_errors: false,
        submitted_at: "2025-09-10T14:30:00Z",
        started_at: "2025-09-10T14:31:00Z",
        ended_at: "2025-09-10T14:33:45Z"
    },
    {
        id: 2,
        teama_name: "CodeCrusaders",
        teama_version: 3,
        teamb_name: "DataDragons",
        teamb_version: 2,
        winner_name: null,
        tourney: 1,
        run_status: "pending",
        has_errors: false,
        submitted_at: "2025-09-10T15:00:00Z",
        started_at: null,
        ended_at: null
    },
    {
        id: 3,
        teama_name: "EliteEngineers",
        teama_version: 1,
        teamb_name: "FutureForce",
        teamb_version: 4,
        winner_name: "FutureForce",
        tourney: 2,
        run_status: "success",
        has_errors: false,
        submitted_at: "2025-09-10T13:15:00Z",
        started_at: "2025-09-10T13:16:00Z",
        ended_at: "2025-09-10T13:18:30Z"
    },
    {
        id: 4,
        teama_name: "GammaGrid",
        teama_version: 2,
        teamb_name: "HyperHackers",
        teamb_version: 1,
        winner_name: null,
        tourney: null,
        run_status: "failure",
        has_errors: true,
        submitted_at: "2025-09-10T12:45:00Z",
        started_at: "2025-09-10T12:46:00Z",
        ended_at: "2025-09-10T12:46:15Z"
    },
    {
        id: 5,
        teama_name: "InnovatorsInc",
        teama_version: 3,
        teamb_name: "JetStreamers",
        teamb_version: 2,
        winner_name: "InnovatorsInc",
        tourney: 1,
        run_status: "success",
        has_errors: false,
        submitted_at: "2025-09-10T11:20:00Z",
        started_at: "2025-09-10T11:21:00Z",
        ended_at: "2025-09-10T11:24:10Z"
    },
    {
        id: 6,
        teama_name: "BetaBots",
        teama_version: 2,
        teamb_name: "CodeCrusaders",
        teamb_version: 1,
        winner_name: "BetaBots",
        tourney: 2,
        run_status: "success",
        has_errors: false,
        submitted_at: "2025-09-10T16:15:00Z",
        started_at: "2025-09-10T16:16:00Z",
        ended_at: "2025-09-10T16:19:20Z"
    },
    {
        id: 7,
        teama_name: "AlphaTeam",
        teama_version: 3,
        teamb_name: "FutureForce",
        teamb_version: 4,
        winner_name: "FutureForce",
        tourney: 1,
        run_status: "success",
        has_errors: false,
        submitted_at: "2025-09-10T17:00:00Z",
        started_at: "2025-09-10T17:01:00Z",
        ended_at: "2025-09-10T17:04:15Z"
    },
    {
        id: 8,
        teama_name: "DataDragons",
        teama_version: 3,
        teamb_name: "InnovatorsInc",
        teamb_version: 2,
        winner_name: "DataDragons",
        tourney: 2,
        run_status: "success",
        has_errors: false,
        submitted_at: "2025-09-10T18:30:00Z",
        started_at: "2025-09-10T18:31:00Z",
        ended_at: "2025-09-10T18:34:50Z"
    },
    {
        id: 9,
        teama_name: "GammaGrid",
        teama_version: 3,
        teamb_name: "EliteEngineers",
        teamb_version: 2,
        winner_name: null,
        tourney: 1,
        run_status: "pending",
        has_errors: false,
        submitted_at: "2025-09-10T19:00:00Z",
        started_at: "2025-09-10T19:01:00Z",
        ended_at: null
    },
    {
        id: 10,
        teama_name: "HyperHackers",
        teama_version: 2,
        teamb_name: "JetStreamers",
        teamb_version: 3,
        winner_name: "JetStreamers",
        tourney: null,
        run_status: "success",
        has_errors: false,
        submitted_at: "2025-09-10T10:45:00Z",
        started_at: "2025-09-10T10:46:00Z",
        ended_at: "2025-09-10T10:49:25Z"
    }
];

const samplePagination = {
    limit: 25,
    offset: 0,
    count: 10
};

// Load matches on page load
document.addEventListener('DOMContentLoaded', function() {
    loadMatches();

    // Add Enter key listeners to filter inputs
    setupEnterKeyListeners();
});

function setupEnterKeyListeners() {
    // Get all filter input elements
    const filterInputs = [
        document.getElementById('teamFilter'),
        document.getElementById('tourneyFilter')
    ];

    // Add Enter key listener to each input
    filterInputs.forEach(input => {
        if (input) {
            input.addEventListener('keypress', function(event) {
                if (event.key === 'Enter') {
                    event.preventDefault();
                    loadMatches(0); // Reset to first page when applying filters
                }
            });
        }
    });

    // Also add listeners to select dropdowns for consistency
    const filterSelects = [
        document.getElementById('statusFilter'),
        document.getElementById('winnerFilter'),
        document.getElementById('orderBy'),
        document.getElementById('orderDirection')
    ];

    filterSelects.forEach(select => {
        if (select) {
            select.addEventListener('keypress', function(event) {
                if (event.key === 'Enter') {
                    event.preventDefault();
                    loadMatches(0);
                }
            });
        }
    });
}

async function loadMatches(page = 0, forceReload = false) {
    const loading = document.getElementById('loading');
    const error = document.getElementById('error');
    const matchesContainer = document.getElementById('matchesContainer');

    loading.classList.remove('d-none');
    error.classList.add('d-none');
    matchesContainer.style.opacity = '0.5';

    currentPage = page;

    try {
        let sourceMatches = [];

        if (USE_SAMPLE_DATA) {
            console.log('Running in sample data mode');

            // Filter sample data based on current filters
            let filteredMatches = [...sampleMatches];

            const status = document.getElementById('statusFilter').value;
            const winner = document.getElementById('winnerFilter').value;
            const team = document.getElementById('teamFilter').value;
            const tourney = document.getElementById('tourneyFilter').value;
            const orderBy = document.getElementById('orderBy').value;
            const orderDirection = document.getElementById('orderDirection').value;

            if (status) {
                filteredMatches = filteredMatches.filter(match => match.run_status === status);
            }

            if (winner) {
                if (winner === 'no_winner') {
                    filteredMatches = filteredMatches.filter(match => !match.winner_name);
                } else {
                    filteredMatches = filteredMatches.filter(match => match.winner_name === winner);
                }
            }

            if (team.trim()) {
                const teamNames = team.trim().split(',').map(name => name.trim().toLowerCase()).filter(name => name.length > 0);

                if (teamNames.length === 1) {
                    filteredMatches = filteredMatches.filter(match =>
                        match.teama_name.toLowerCase().includes(teamNames[0]) ||
                        match.teamb_name.toLowerCase().includes(teamNames[0])
                    );
                } else if (teamNames.length === 2) {
                    filteredMatches = filteredMatches.filter(match => {
                        const teamA = match.teama_name.toLowerCase();
                        const teamB = match.teamb_name.toLowerCase();
                        return (
                            (teamA.includes(teamNames[0]) && teamB.includes(teamNames[1])) ||
                            (teamA.includes(teamNames[1]) && teamB.includes(teamNames[0]))
                        );
                    });
                }
            }

            if (tourney) {
                filteredMatches = filteredMatches.filter(match => match.tourney == tourney);
            }

            // Sort the filtered matches
            filteredMatches.sort((a, b) => {
                let valA = a[orderBy];
                let valB = b[orderBy];

                if (orderBy === 'submitted_at' || orderBy === 'ended_at') {
                    valA = valA ? new Date(valA).getTime() : 0;
                    valB = valB ? new Date(valB).getTime() : 0;
                }

                if (valA < valB) return orderDirection === 'asc' ? -1 : 1;
                if (valA > valB) return orderDirection === 'asc' ? 1 : -1;
                return 0;
            });

            // Paginate the filtered and sorted matches
            const startIndex = page * matchesPerPage;
            const itemsToFetch = matchesPerPage + 1; // Fetch one extra to check for next page
            const paginatedMatches = filteredMatches.slice(startIndex, startIndex + itemsToFetch);

            hasNextPage = paginatedMatches.length > matchesPerPage;
            const matchesToDisplay = paginatedMatches.slice(0, matchesPerPage);

            sourceMatches = [...sampleMatches]; // For winner filter update
            displayMatches(matchesToDisplay);

        } else {
            // PRODUCTION MODE: Use API with server-side filtering
            console.log('Fetching matches from API with filters...');
            const params = new URLSearchParams();
            params.append('limit', matchesPerPage + 1); // Fetch one extra to check for next page
            params.append('offset', page * matchesPerPage);

            // Apply filters as API parameters
            const status = document.getElementById('statusFilter').value;
            const winner = document.getElementById('winnerFilter').value;
            const team = document.getElementById('teamFilter').value;
            const tourney = document.getElementById('tourneyFilter').value;
            const orderBy = document.getElementById('orderBy').value;
            const orderDirection = document.getElementById('orderDirection').value;

            if (status) params.append('status', status);
            if (winner) {
                if (winner === 'no_winner') {
                    params.append('winner', ''); // Empty string for no winner
                } else {
                    params.append('winner', winner);
                }
            }
            if (team.trim()) {
                const teamNames = team.trim().split(',').map(name => name.trim()).filter(name => name.length > 0);
                teamNames.forEach(teamName => {
                    params.append('teams', teamName);
                });
            }
            if (tourney) params.append('tourney', tourney);
            if (orderBy) params.append('order_by', orderBy);
            if (orderDirection) params.append('order', orderDirection);

            const response = await fetch(`${API_BASE_URL}/match/list?${params}`);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            console.log('API Response:', data);

            totalMatches = data.pagination?.count || 0;
            const fetchedMatches = data.matches || [];
            hasNextPage = fetchedMatches.length > matchesPerPage;
            const matchesToDisplay = fetchedMatches.slice(0, matchesPerPage);

            // If we got no matches and we're not on the first page, it means we clicked "next" on the last page.
            if (matchesToDisplay.length === 0 && currentPage > 0) {
                console.log('No matches found on page', currentPage, ', going back to previous page');
                loadMatches(currentPage - 1);
                return;
            }

            sourceMatches = matchesToDisplay;
            displayMatches(matchesToDisplay);
        }

        updatePagination();
        updateWinnerFilter(sourceMatches);

    } catch (err) {
        console.error('Error loading matches:', err);
        showError(`Failed to load matches: ${err.message}`);
    } finally {
        loading.classList.add('d-none');
        matchesContainer.style.opacity = '1';
    }
}

function displayMatches(matches) {
    const tbody = document.getElementById('matchesTableBody');
    tbody.innerHTML = '';

    if (!matches || matches.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" class="text-center text-muted py-4"><i class="fas fa-search me-2"></i>No matches found</td></tr>';
        return;
    }

    matches.forEach(match => {
        const row = document.createElement('tr');

        // Status badge
        let statusBadge = '';
        switch (match.run_status) {
            case 'success':
                statusBadge = '<span class="badge bg-success">Success</span>';
                break;
            case 'pending':
                statusBadge = '<span class="badge bg-warning text-dark">Pending</span>';
                break;
            case 'failure':
                statusBadge = '<span class="badge bg-danger">Failure</span>';
                break;
            default:
                statusBadge = '<span class="badge bg-secondary">Unknown</span>';
        }

        // Errors icon -- has_errors is only set from engine stderr or a
        // nonzero mm-run-match exit, never bot stderr, so this flags real
        // infrastructure/handshake failures, not routine bot debug prints.
        if (match.has_errors) {
            statusBadge += ` <i class="fas fa-triangle-exclamation text-warning" role="button"
                title="This match had errors -- click to view"
                onclick="viewMatchErrors(${match.id})"></i>`;
        }

        // Calculate duration
        let duration = 'N/A';
        if (match.started_at && match.ended_at) {
            const start = new Date(match.started_at);
            const end = new Date(match.ended_at);
            const diffMs = end - start;
            const diffSec = Math.round(diffMs / 1000);
            duration = `${diffSec}s`;
        }

        // Winner display with highlighting
        let winner = '<em>---</em>';
        let winnerStyle = '';

        if (match.winner_name) {
            const truncatedWinner = match.winner_name.length > TEAM_NAME_TRUNCATE_LENGTH ? match.winner_name.substring(0, TEAM_NAME_TRUNCATE_LENGTH) + '...' : match.winner_name;
            winner = `<span title="${match.winner_name}">${truncatedWinner}</span>`;
            winnerStyle = 'style="background-color: #058e8e; color: white; padding: 2px 5px; border-radius: 4px;"';
        }

        // Tournament display
        const tournament = match.tourney ? `#${match.tourney}` : 'N/A';

        const truncatedTeamA = match.teama_name.length > TEAM_NAME_TRUNCATE_LENGTH ? match.teama_name.substring(0, TEAM_NAME_TRUNCATE_LENGTH) + '...' : match.teama_name;
        const truncatedTeamB = match.teamb_name.length > TEAM_NAME_TRUNCATE_LENGTH ? match.teamb_name.substring(0, TEAM_NAME_TRUNCATE_LENGTH) + '...' : match.teamb_name;

        row.innerHTML = `
            <td><strong>#${match.id}</strong></td>
            <td>
                <span title="${match.teama_name}">${truncatedTeamA}</span>
                <small class="text-muted">(v${match.teama_version})</small>
            </td>
            <td>
                <span title="${match.teamb_name}">${truncatedTeamB}</span>
                <small class="text-muted">(v${match.teamb_version})</small>
            </td>
            <td><span ${winnerStyle}>${winner}</span></td>
            <td>${statusBadge}</td>
            <td>${tournament}</td>
            <td>
                <small>${formatDateTime(match.submitted_at)}</small>
            </td>
            <td>${duration}</td>
            <td>
                <button class="btn btn-sm btn-outline-success ms-1" onclick="viewMatchDetails(${match.id})" title="View Details">
                    <i class="bi bi-eye"></i> Details
                </button>
                ${match.run_status === 'success' ?
                    `<button class="btn btn-sm btn-outline-secondary ms-1" onclick="viewMatchLog(${match.id})" title="View Log">
                        <i class="bi bi-file-text"></i> Game Log
                    </button>
                    <button class="btn btn-sm btn-outline-primary" onclick="visualizeMatch(${match.id})" title="Visualize Match">
                        <i class="bi bi-play-circle"></i> Visualize
                    </button>` : ''
                }
            </td>
        `;
        tbody.appendChild(row);
    });
}

async function viewMatchDetails(matchId) {
    try {
        if (USE_SAMPLE_DATA) {
            // SAMPLE MODE: Use local dummy data
            const match = sampleMatches.find(m => m.id == matchId) || sampleMatches[0];

            alert(`Match #${match.id} Details ${USE_SAMPLE_DATA ? '(Sample)' : ''}:\n\n` +
                  `Team A: ${match.teama_name} (v${match.teama_version})\n` +
                  `Team B: ${match.teamb_name} (v${match.teamb_version})\n` +
                  `Winner: ${match.winner_name || 'No winner'}\n` +
                  `Status: ${match.run_status}\n` +
                  `Tournament: ${match.tourney || 'N/A'}\n` +
                  `Submitted: ${formatDateTime(match.submitted_at)}\n` +
                  `Started: ${match.started_at ? formatDateTime(match.started_at) : 'N/A'}\n` +
                  `Ended: ${match.ended_at ? formatDateTime(match.ended_at) : 'N/A'}`);
        } else {
            const response = await fetch(`${API_BASE_URL}/match/${matchId}`);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            const match = await response.json();

            alert(`Match #${match.id} Details:\n\n` +
                  `Team A: ${match.teama_name} (v${match.teama_version})\n` +
                  `Team B: ${match.teamb_name} (v${match.teamb_version})\n` +
                  `Winner: ${match.winner_name || 'No winner'}\n` +
                  `Status: ${match.run_status}\n` +
                  `Tournament: ${match.tourney || 'N/A'}\n` +
                  `Submitted: ${formatDateTime(match.submitted_at)}\n` +
                  `Started: ${match.started_at ? formatDateTime(match.started_at) : 'N/A'}\n` +
                  `Ended: ${match.ended_at ? formatDateTime(match.ended_at) : 'N/A'}`);
        }
    } catch (err) {
        if (USE_SAMPLE_DATA) {
            // Sample mode fallback
            const match = sampleMatches[0];
            alert(`Match #${match.id} Details (Sample Fallback):\n\n` +
                  `Team A: ${match.teama_name} (v${match.teama_version})\n` +
                  `Team B: ${match.teamb_name} (v${match.teamb_version})\n` +
                  `Winner: ${match.winner_name || 'No winner'}\n` +
                  `Status: ${match.run_status}\n` +
                  `Tournament: ${match.tourney || 'N/A'}\n` +
                  `Submitted: ${formatDateTime(match.submitted_at)}\n` +
                  `Started: ${match.started_at ? formatDateTime(match.started_at) : 'N/A'}\n` +
                  `Ended: ${match.ended_at ? formatDateTime(match.ended_at) : 'N/A'}`);
        } else {
            showError(`Failed to load match details: ${err.message}`);
        }
    }
}

async function viewMatchLog(matchId) {
    try {
        // Show modal immediately with loading spinner
        const modal = new bootstrap.Modal(document.getElementById('logModal'));
        const logLoading = document.getElementById('logLoading');
        const matchLog = document.getElementById('matchLog');

        // Show loading, hide log content
        logLoading.style.display = 'block';
        matchLog.style.display = 'none';
        matchLog.textContent = '';

        modal.show();

        if (USE_SAMPLE_DATA) {
            // SAMPLE MODE: Generate dummy log content
            const match = sampleMatches.find(m => m.id == matchId) || sampleMatches[0];

            const logText = `Match #${match.id} Game Log (Sample Data)
========================================

Teams: ${match.teama_name} vs ${match.teamb_name}
Status: ${match.run_status}
Winner: ${match.winner_name || 'No winner'}

Game Started: ${match.started_at ? formatDateTime(match.started_at) : 'N/A'}
Game Ended: ${match.ended_at ? formatDateTime(match.ended_at) : 'N/A'}

Turn 1: ${match.teama_name} moves robot to position (2, 3)
Turn 2: ${match.teamb_name} collects resource at (5, 7)
Turn 3: ${match.teama_name} builds structure at (1, 1)
Turn 4: ${match.teamb_name} attacks opponent base
Turn 5: ${match.teama_name} defends successfully
...
Turn 50: Game ended - ${match.winner_name || 'Draw'}

Final Score:
${match.teama_name}: 1250 points
${match.teamb_name}: ${match.winner_name === match.teama_name ? '1100' : '1300'} points

This is sample log data for demonstration purposes.`;

            matchLog.textContent = logText;
            document.getElementById('logModalLabel').textContent = `Match #${matchId} Log (Sample)`;

        } else {
            // The response is gzip-encoded on the wire (Content-Encoding: gzip);
            // fetch() inflates it transparently, so .text() gets plain NDJSON.
            const response = await fetch(`${API_BASE_URL}/match/${matchId}/log`);
            if (!response.ok) {
                if (response.status === 400) {
                    throw new Error('Match not completed successfully');
                }
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const logText = await response.text();
            matchLog.textContent = logText;
            document.getElementById('logModalLabel').textContent = `Match #${matchId} Log`;
        }

        // Hide loading, show log content
        logLoading.style.display = 'none';
        matchLog.style.display = 'block';

    } catch (err) {
        const logLoading = document.getElementById('logLoading');
        const matchLog = document.getElementById('matchLog');

        logLoading.style.display = 'none';
        matchLog.style.display = 'block';

        if (USE_SAMPLE_DATA) {
            // Sample mode fallback
            matchLog.textContent = 'Sample match log data for demonstration.\n\nThis would contain the actual game log when connected to the real API.';
            document.getElementById('logModalLabel').textContent = `Match Log (Sample Fallback)`;

            const modal = new bootstrap.Modal(document.getElementById('logModal'));
            modal.show();
        } else {
            showError(`Failed to load match log: ${err.message}`);
        }
    }
}

async function viewMatchErrors(matchId) {
    const modal = new bootstrap.Modal(document.getElementById('errorsModal'));
    const errorsLoading = document.getElementById('errorsLoading');
    const errorsContent = document.getElementById('errorsContent');

    errorsLoading.style.display = 'block';
    errorsContent.style.display = 'none';

    modal.show();

    try {
        if (USE_SAMPLE_DATA) {
            document.getElementById('engineErr').textContent = 'engine: bot B failed handshake (sample data)';
            document.getElementById('botAErr').textContent = '';
            document.getElementById('botBErr').textContent = '';
        } else {
            const response = await fetch(`${API_BASE_URL}/match/${matchId}/errors`);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            const errs = await response.json();

            document.getElementById('engineErr').textContent = errs.engine_err || '(none)';
            document.getElementById('botAErr').textContent = errs.bota_err || '(none)';
            document.getElementById('botBErr').textContent = errs.botb_err || '(none)';
        }

        document.getElementById('errorsModalLabel').innerHTML =
            `<i class="fas fa-triangle-exclamation text-warning me-2"></i>Match #${matchId} Errors`;

        errorsLoading.style.display = 'none';
        errorsContent.style.display = 'block';
    } catch (err) {
        errorsLoading.style.display = 'none';
        errorsContent.style.display = 'block';
        document.getElementById('engineErr').textContent = `Failed to load errors: ${err.message}`;
        document.getElementById('botAErr').textContent = '';
        document.getElementById('botBErr').textContent = '';
    }
}

function updateWinnerFilter(matches) {
    const winnerFilter = document.getElementById('winnerFilter');
    const currentValue = winnerFilter.value;

    // Extract unique team names from matches
    matches.forEach(match => {
        if (match.teama_name) allTeamNames.add(match.teama_name);
        if (match.teamb_name) allTeamNames.add(match.teamb_name);
        if (match.winner_name) allTeamNames.add(match.winner_name);
    });

    // Clear existing options except the first two
    while (winnerFilter.children.length > 2) {
        winnerFilter.removeChild(winnerFilter.lastChild);
    }

    // Add team options
    const sortedTeams = Array.from(allTeamNames).sort();
    sortedTeams.forEach(teamName => {
        const option = document.createElement('option');
        option.value = teamName;
        option.textContent = teamName;
        winnerFilter.appendChild(option);
    });

    // Restore selected value if it still exists
    if (currentValue && Array.from(winnerFilter.options).some(opt => opt.value === currentValue)) {
        winnerFilter.value = currentValue;
    }
}

function clearFilters() {
    document.getElementById('statusFilter').value = '';
    document.getElementById('winnerFilter').value = '';
    document.getElementById('teamFilter').value = '';
    document.getElementById('tourneyFilter').value = '';
    document.getElementById('orderBy').value = 'submitted_at';
    document.getElementById('orderDirection').value = 'desc';
    loadMatches(0); // Reset to first page when clearing filters
}

function showError(message) {
    const error = document.getElementById('error');
    const errorMessage = document.getElementById('errorMessage');
    errorMessage.textContent = message;
    error.classList.remove('d-none');
}

function visualizeMatch(matchId) {
    const baseUrl = window.location.origin;
    window.open(`${baseUrl}/visualizer/#${matchId}`, '_blank');
}

function formatDateTime(dateString) {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString();
}

function updatePagination() {
    const paginationContainer = document.getElementById('pagination');
    if (!paginationContainer) return;

    // Hide pagination if we're on the first page and there's no next page
    if (currentPage === 0 && !hasNextPage) {
        paginationContainer.innerHTML = '';
        return;
    }

    let paginationHTML = '<nav aria-label="Matches pagination"><ul class="pagination justify-content-center">';

    // Previous button
    if (currentPage > 0) {
        paginationHTML += `<li class="page-item">
            <a class="page-link" href="#" onclick="loadMatches(${currentPage - 1}); return false;" aria-label="Previous">
                <span aria-hidden="true">&laquo;</span> Previous
            </a>
        </li>`;
    } else {
        paginationHTML += `<li class="page-item disabled">
            <span class="page-link" aria-label="Previous">
                <span aria-hidden="true">&laquo;</span> Previous
            </span>
        </li>`;
    }

    // Next button
    if (hasNextPage) {
        paginationHTML += `<li class="page-item">
            <a class="page-link" href="#" onclick="loadMatches(${currentPage + 1}); return false;" aria-label="Next">
                Next <span aria-hidden="true">&raquo;</span>
            </a>
        </li>`;
    } else {
        paginationHTML += `<li class="page-item disabled">
            <span class="page-link" aria-label="Next">
                Next <span aria-hidden="true">&raquo;</span>
            </span>
        </li>`;
    }

    paginationHTML += '</ul></nav>';

    // Add pagination info
    const startIndex = currentPage * matchesPerPage + 1;
    const endIndex = Math.min((currentPage + 1) * matchesPerPage, totalMatches);

    paginationHTML += `<div class="text-center text-muted mt-2">
        <small>Showing ${startIndex}-${endIndex} of ${totalMatches} matches</small>
    </div>`;

    paginationContainer.innerHTML = paginationHTML;
}

// Auto-refresh every minute for pending matches
setInterval(() => {
    const statusFilter = document.getElementById('statusFilter').value;
    if (statusFilter === 'pending' || statusFilter === '') {
        loadMatches(currentPage);
    }
}, 60000);

function copyLog() {
    const logText = document.getElementById('matchLog').textContent;
    navigator.clipboard.writeText(logText).then(() => {
        const copyButton = document.querySelector('.modal-footer .btn-secondary');
        const originalText = copyButton.innerHTML;
        copyButton.innerHTML = '<i class="bi bi-check-lg"></i> Copied!';
        setTimeout(() => {
            copyButton.innerHTML = originalText;
        }, 2000);
    }).catch(err => {
        console.error('Failed to copy log: ', err);
        alert('Failed to copy log to clipboard.');
    });
}

function downloadLog() {
    const logText = document.getElementById('matchLog').textContent;
    const matchId = document.getElementById('logModalLabel').textContent.match(/\d+/)[0] || 'log';
    const blob = new Blob([logText], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `friendly-match-${matchId}-log.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(a.href);
}
