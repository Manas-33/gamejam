/**
 * Squad.js - Circular Linked List for Squad Management
 * Manages a squad of 4-5 players in a circular chain
 */

class Squad {
    constructor(id, teamSize = 4) {
        this.id = id;
        this.players = []; // Array of player objects
        this.scanMap = new Map(); // Maps scannerId -> targetId (who they scanned)
        this.teamSize = teamSize;
        this.maxSize = teamSize; // Exact team size only
        this.minSize = teamSize;
        this.isLoopComplete = false;
        this.progress = 0; // 0-100 for heist phase
        this.currentMinigame = null;
        this.minigameStates = new Map(); // Player-specific minigame states
    }

    /**
     * Add a player to the squad
     * @param {Object} player - Player object with id, nickname, drawing, tell
     * @returns {boolean} - Whether player was added successfully
     */
    addPlayer(player) {
        if (this.players.length >= this.maxSize) {
            return false;
        }

        this.players.push({
            ...player,
            index: this.players.length,
            connected: true,
            scanComplete: false,
            lastHeartbeat: Date.now(),
        });

        return true;
    }

    /**
     * Remove a player from the squad
     * @param {string} playerId - The player's socket ID
     */
    removePlayer(playerId) {
        const index = this.players.findIndex(p => p.id === playerId);
        if (index !== -1) {
            this.players[index].connected = false;
        }
    }

    /**
     * Get the target player for a given player (circular linked list)
     * Player 1 -> Player 2 -> Player 3 -> Player 4 -> Player 1
     * @param {string} playerId - The player's socket ID
     * @returns {Object|null} - The target player object
     */
    getTarget(playerId) {
        const playerIndex = this.players.findIndex(p => p.id === playerId);
        if (playerIndex === -1) return null;

        // Circular: next player, wrapping to first
        const targetIndex = (playerIndex + 1) % this.players.length;
        return this.players[targetIndex];
    }

    /**
     * Record when a player successfully scans their target
     * @param {string} scannerId - The scanner's socket ID
     * @param {string} targetId - The target's socket ID
     * @returns {boolean} - Whether the scan was valid and recorded
     */
    recordScan(scannerId, targetId) {
        const expectedTarget = this.getTarget(scannerId);

        if (!expectedTarget || expectedTarget.id !== targetId) {
            return false; // Invalid scan
        }

        // Record the scan
        this.scanMap.set(scannerId, targetId);

        // Mark player's scan as complete
        const scanner = this.players.find(p => p.id === scannerId);
        if (scanner) {
            scanner.scanComplete = true;
        }

        // Check if loop is complete
        this.isLoopComplete = this.checkLoopComplete();

        return true;
    }

    /**
     * Check if the circular chain scan is complete
     * Returns true only when all players have scanned their targets: 1 -> 2 -> 3 -> ... -> 1
     * @returns {boolean}
     */
    checkLoopComplete() {
        if (this.players.length < 2) {
            return false;
        }

        // Every player must have scanned their correct target
        for (let i = 0; i < this.players.length; i++) {
            const player = this.players[i];
            const expectedTarget = this.players[(i + 1) % this.players.length];

            const actualTarget = this.scanMap.get(player.id);

            if (!actualTarget || actualTarget !== expectedTarget.id) {
                return false;
            }
        }

        return true;
    }

    /**
     * Get the number of completed scans
     * @returns {number}
     */
    getCompletedScans() {
        return this.scanMap.size;
    }

    /**
     * Get squad status for broadcasting
     * @returns {Object}
     */
    getStatus() {
        return {
            id: this.id,
            playerCount: this.players.length,
            completedScans: this.getCompletedScans(),
            totalScans: this.players.length,
            isLoopComplete: this.isLoopComplete,
            progress: this.progress,
            currentMinigame: this.currentMinigame,
            players: this.players.map(p => ({
                id: p.id,
                nickname: p.nickname,
                connected: p.connected,
                scanComplete: p.scanComplete,
            })),
        };
    }

    /**
     * Set the current minigame for the squad
     * @param {string} minigame - 'signal_jammer' or 'tumbler'
     */
    setMinigame(minigame) {
        this.currentMinigame = minigame;
        this.minigameStates.clear();
    }

    /**
     * Update a player's minigame state
     * @param {string} playerId
     * @param {Object} state
     */
    updateMinigameState(playerId, state) {
        this.minigameStates.set(playerId, {
            ...this.minigameStates.get(playerId),
            ...state,
            timestamp: Date.now(),
        });
    }

    /**
     * Check if all players are at their sweet spot (for Tumbler game)
     * @returns {boolean}
     */
    checkAllAtSweetSpot() {
        if (this.minigameStates.size !== this.players.length) {
            return false;
        }

        for (const [, state] of this.minigameStates) {
            if (!state.atSweetSpot) {
                return false;
            }
        }

        return true;
    }

    /**
     * Update squad progress
     * @param {number} delta - Amount to add to progress
     */
    updateProgress(delta) {
        this.progress = Math.min(100, Math.max(0, this.progress + delta));
    }

    /**
     * Check if a player is the designated leader (first player)
     * @param {string} playerId
     * @returns {boolean}
     */
    isLeader(playerId) {
        return this.players.length > 0 && this.players[0].id === playerId;
    }

    /**
     * Handle player reconnection
     * @param {string} playerId
     */
    handleReconnect(playerId) {
        const player = this.players.find(p => p.id === playerId);
        if (player) {
            player.connected = true;
            player.lastHeartbeat = Date.now();
        }
    }

    /**
     * Get all disconnected players
     * @returns {Array}
     */
    getDisconnectedPlayers() {
        return this.players.filter(p => !p.connected);
    }

    /**
     * Check for timeout on disconnected players
     * @param {number} graceMs - Grace period in milliseconds
     * @returns {Array} - Players that have timed out
     */
    checkTimeouts(graceMs = 30000) {
        const now = Date.now();
        return this.players.filter(p =>
            !p.connected && (now - p.lastHeartbeat) > graceMs
        );
    }
}

export default Squad;
