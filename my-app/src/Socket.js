import io from 'socket.io-client';

export const initSocket = () => {
    return io('http://localhost:5000', {
        reconnectionDelay: 1000,
        reconnection: true,
        reconnectionAttempts: 5,
        transports: ['websocket'],
        'force new connection': true,
    }
    
    );

};