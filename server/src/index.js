/**
 * Server entry point - Socket.io server for Protocol: UNMASK
 */

import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import GameManager from './GameManager.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

// Serve static files from client build in production
const clientDistPath = join(__dirname, '../../client/dist');
app.use(express.static(clientDistPath));

// SPA fallback - serve index.html for all non-API routes (Express 5 compatible)
app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/socket.io') && !req.path.includes('.')) {
        res.sendFile(join(clientDistPath, 'index.html'));
    } else {
        next();
    }
});

const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST'],
    },
    pingTimeout: 60000,
    pingInterval: 25000,
    maxHttpBufferSize: 1e6,
    perMessageDeflate: {
        threshold: 1024,
    },
    connectionStateRecovery: {
        maxDisconnectionDuration: 2 * 60 * 1000,
        skipMiddlewares: true,
    },
});

// Initialize game manager
const gameManager = new GameManager(io);

// Timeout check interval
setInterval(() => {
    gameManager.checkTimeouts();
}, 5000);

// Player namespace
io.on('connection', (socket) => {
    console.log(`[CONNECT] ${socket.id}`);

    // Player registration
    socket.on('register', (data, callback) => {
        const player = gameManager.registerPlayer(socket.id, data);

        // Broadcast to GM view
        io.to('gm').emit('player_joined', {
            id: socket.id,
            nickname: data.nickname,
            drawing: data.drawing,
            count: gameManager.players.size,
        });

        callback({ success: true, player, prompt: player.prompt });
    });

    // Join squad room when chain phase starts
    socket.on('join_squad_room', () => {
        const player = gameManager.players.get(socket.id);
        if (player && player.squad) {
            socket.join(player.squad);
            console.log(`[ROOM] ${socket.id} joined squad room ${player.squad}`);
        }
    });

    // Request prompt before registration
    socket.on('get_prompt', (callback) => {
        callback({ prompt: gameManager.getRandomPrompt() });
    });

    // Get target info for chain phase
    socket.on('get_target', (callback) => {
        const target = gameManager.getTargetInfo(socket.id);
        callback({ target });
    });

    // Scan target
    socket.on('scan', (data, callback) => {
        const result = gameManager.handleScan(socket.id, data.targetId);

        if (result.success) {
            // Join the squad room for team-based communications
            const player = gameManager.players.get(socket.id);
            if (player && player.squad) {
                socket.join(player.squad);
            }

            // Notify squad about scan progress
            io.to(result.squadId).emit('scan_complete', {
                scannerId: socket.id,
            });

            // Broadcast to GM for network visualization
            io.to('gm').emit('scan_recorded', {
                squadId: result.squadId,
                scannerId: socket.id,
            });

            if (result.loopComplete) {
                // This squad's chain is complete - they can proceed independently!
                io.to(result.squadId).emit('squad_activated');
                io.to('gm').emit('squad_loop_complete', { squadId: result.squadId });
                
                // Advance this squad to heist phase
                gameManager.advanceSquad(result.squadId, 'heist');
                
                // Only this squad sees the phase change to heist
                io.to(result.squadId).emit('phase_change', { phase: 'heist' });
            }
        }

        callback(result);
    });

    // Minigame state updates
    socket.on('minigame_state', (data) => {
        gameManager.updateMinigameState(socket.id, data);
    });

    // Signal Jammer guess
    socket.on('signal_jammer_guess', (data, callback) => {
        const result = gameManager.handleSignalJammerGuess(socket.id, data.symbolIndex);

        if (!result.success) {
            // Broadcast error to GM for visual feedback
            io.to('gm').emit('squad_error', { squadId: result.squadId });
        }

        callback(result);
    });

    // Get clue for Signal Jammer
    socket.on('get_clue', (callback) => {
        const player = gameManager.players.get(socket.id);
        if (!player || !player.squad) {
            callback({ clue: null });
            return;
        }

        const squad = gameManager.squads.get(player.squad);
        if (!squad) {
            callback({ clue: null });
            return;
        }

        // Generate unique clue for this player
        const playerIndex = squad.players.findIndex(p => p.id === socket.id);
        const clues = [
            'It is NOT in the first row',
            'It is NOT in the first column',
            'It is NOT red',
            'It is in the center area',
            'It has a sharp angle',
        ];

        callback({ clue: clues[playerIndex % clues.length] });
    });

    // Getaway code verification
    socket.on('verify_code', (data, callback) => {
        const player = gameManager.players.get(socket.id);
        if (!player || !player.squad) {
            callback({ success: false });
            return;
        }

        const result = gameManager.verifyCode(player.squad, data.code);

        if (result.success) {
            io.to(player.squad).emit('phase_change', { phase: 'complete' });
            io.to(player.squad).emit('heist_complete');
            io.to(player.squad).emit('view_change', { view: 'complete' });
            io.to('gm').emit('squad_completed', { squadId: player.squad });
        }

        callback({ success: result.success });
    });

    // DEV: Squad-wide advance to next view
    // When one player triggers this, ALL players advance
    socket.on('squad_advance', (data) => {
        console.log(`[SQUAD_ADVANCE] Broadcasting view change to: ${data.view}`);
        // Broadcast to ALL connected players
        io.emit('view_change', { view: data.view });
    });

    // Get code fragment - assigns unique positions to each player within their squad
    socket.on('get_fragment', (callback) => {
        const player = gameManager.players.get(socket.id);
        if (!player || !player.squad) {
            callback({ char: '?', position: 1, codeLength: 4 });
            return;
        }

        const squadId = player.squad;
        const fragments = gameManager.codeFragments.get(squadId);
        if (!fragments) {
            callback({ char: '?', position: 1, codeLength: 4 });
            return;
        }

        // Initialize fragment tracking per squad
        if (!global.squadFragmentAssignments) {
            global.squadFragmentAssignments = new Map();
        }
        if (!global.squadFragmentAssignments.has(squadId)) {
            global.squadFragmentAssignments.set(squadId, { assignments: new Map(), counter: 0 });
        }

        const squadTracking = global.squadFragmentAssignments.get(squadId);

        // Check if this socket already has an assignment
        if (squadTracking.assignments.has(socket.id)) {
            const assignment = squadTracking.assignments.get(socket.id);
            callback(assignment);
            return;
        }

        // Assign next position within this squad's code
        const codeLength = fragments.length;
        const position = squadTracking.counter % codeLength;
        squadTracking.counter++;

        const assignment = {
            char: fragments[position],
            position: position + 1, // 1-indexed for display
            codeLength: codeLength
        };

        squadTracking.assignments.set(socket.id, assignment);
        console.log(`[FRAGMENT] Squad ${squadId}: Assigned position ${assignment.position} (${assignment.char}) to ${socket.id}`);

        callback(assignment);
    });

    // Tumbler state tracking for sync - TEAM BASED
    socket.on('tumbler_state', (data) => {
        const result = gameManager.handleTumblerState(socket.id, data);
        if (!result) return;

        const { squadId, synced, syncTime, playersReady, totalPlayers, complete } = result;

        // Broadcast sync progress only to this squad
        io.to(squadId).emit('tumbler_sync', {
            synced,
            syncTime,
            playersReady,
            totalPlayers
        });

        // If this squad completed, advance them to getaway
        if (complete) {
            io.to(squadId).emit('phase_change', { phase: 'getaway' });
            io.to(squadId).emit('view_change', { view: 'getaway' });
            io.to('gm').emit('squad_tumbler_complete', { squadId });
        }
    });

    // Get squad info (for team-size based game settings)
    socket.on('get_squad_info', (callback) => {
        const info = gameManager.getPlayerSquadInfo(socket.id);
        callback(info || { squadId: null, teamSize: 4, maxTries: 8, codeLength: 4 });
    });

    // Heartbeat for disconnect handling
    socket.on('heartbeat', () => {
        gameManager.handleHeartbeat(socket.id);
    });

    // Disconnect
    socket.on('disconnect', () => {
        console.log(`[DISCONNECT] ${socket.id}`);
        gameManager.removePlayer(socket.id);

        io.to('gm').emit('player_left', {
            id: socket.id,
            count: gameManager.players.size,
        });
    });
});

// Game Master namespace
const gmNamespace = io.of('/gm');

gmNamespace.on('connection', (socket) => {
    console.log('[GM CONNECT]');
    socket.join('gm');

    // Send current game state
    socket.emit('game_state', gameManager.getGameState());

    // Admin controls
    socket.on('set_phase', (data) => {
        console.log(`[GM] Setting phase to: ${data.phase}`);
        const result = gameManager.setPhase(data.phase);
        if (!result.success) {
            socket.emit('phase_error', { message: result.message });
        }
        gmNamespace.emit('game_state', gameManager.getGameState());
    });

    socket.on('set_team_size', (data) => {
        console.log(`[GM] Setting team size to: ${data.size}`);
        gameManager.setTeamSize(data.size);
        gmNamespace.emit('game_state', gameManager.getGameState());
    });

    socket.on('start_game', () => {
        const result = gameManager.setPhase('chain');
        if (!result.success) {
            socket.emit('phase_error', { message: result.message });
        }
        gmNamespace.emit('game_state', gameManager.getGameState());
    });

    socket.on('start_heist', () => {
        gameManager.setPhase('heist');
        gmNamespace.emit('game_state', gameManager.getGameState());
    });

    socket.on('reset_game', () => {
        gameManager.resetGame();
        io.emit('game_reset');
        gmNamespace.emit('game_state', gameManager.getGameState());
    });
});

// Periodic state broadcast to GM (every 2 seconds for auto-refresh)
setInterval(() => {
    gmNamespace.emit('game_state', gameManager.getGameState());
}, 1000);

const PORT = process.env.PORT || 3001;
const HOST = process.env.NODE_ENV === 'production' ? '0.0.0.0' : 'localhost';

httpServer.listen(PORT, HOST, () => {
    console.log(`🎮 Protocol: UNMASK server running on ${HOST}:${PORT}`);
    console.log(`📊 Configured for up to 100+ concurrent players`);
});
