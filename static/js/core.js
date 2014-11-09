var PEERJS_CONFIG = {
    'key': 'k9epv4abgdd6ajor',
    'config': {
        'iceServers': [
            {'url': 'stun:stun.l.google.com:19302' }
        ]
    },
    'debug': 2
};

var CHANNEL_LEN = 8;

function randomString(num, alphabet) {
    alphabet = alphabet || 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var r = '';

    for (var i=num; i > 0; i--) {
        r += alphabet[~~(Math.random() * alphabet.length)];
    }

    return r;
};


function connect(channel, name, isHost) {
    console.log('Connecting:', channel);

    var id = channel
    if (!isHost) id = [channel, name].join('-');

    var peer = new Peer(id, PEERJS_CONFIG);

    console.log('Created peer:', id, peer);

    peer.on('open', function(id) {
        console.log('Connected:', id);

        var client = isHost ? Host.fromPeer(peer, name) : Client.fromPeer(peer, channel, name);
        $('form#chat').submit(function() {
            var elem = $('input[name="msg"]', this);
            client.sendAll(['msg', name, elem.val()]);
            elem.val('');
        });
    });

    peer.on('error', function(err) {
        console.log('error', err);
    });

    return peer;
};


$(function() {
    var channel, isHost;
    var channel_match = location.hash.match(/#\/(\w+)/);

    if (channel_match) {
        channel = channel_match[1];
        isHost = sessionStorage.getItem(channel) == 'host';
    } else {
        channel = randomString(CHANNEL_LEN);
        sessionStorage.setItem(channel, 'host');
        isHost = true;
        location.hash = '#/' + channel;
    }

    $('form#choose-name').submit(function() {
        var nameInput = $('input[name="name"]', this);
        var name = nameInput.val().trim();

        if (!name) {
            $(this).addClass('error');
            return;
        };

        $(this).remove();

        p = connect(channel, name, isHost);

        $('form#chat').show();
    });
    
});
