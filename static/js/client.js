var Chat = {
    msg: function(from, msg) {
        if (from===null) from = '*';
        else from += ':';

        $('#log').append($('<ul>').text(from + ' ' + msg));
    }
}


var Client = function(conn) {
    this.members = [];
    this.conn = conn;
};

Client.fromPeer = function(peer, channel, name) {
    var conn = peer.connect(channel, {metadata: {'name': name}});
    var client = new Client(conn);

    conn.on('open', function() {
        conn.on('data', function(data) {
            client.handle(data);
        });
        conn.send(['ping']);
    });

    return client;
};

Client.prototype.sendAll = function(data) {
    var ok = this.handle(data);
    if (!ok) return;

    this.conn.send(data);
};

Client.prototype.setMembers = function(members) {
    this.members = members;
};

Client.prototype.handle = function(data) {
    var method = data[0];
    var fn = this.handlers[method];
    if (!fn) {
        console.log('Err: Invalid handler:', method);
        return false;
    }

    fn.apply(this, data.slice(1));
    return true;
};

Client.prototype.handlers = {
    'msg': function(from, msg) {
        Chat.msg(from, msg);
    },
    'members': function(members) {
        this.setMembers(members);

        Chat.msg(null, 'Members: ' + members.map(function(m) { return m.name; }).join(', '));
    },
    'ping': function() {
        console.log('ping received');
    }
}




var Host = function(name, peer, client) {
    this.name = name;
    this.peer = peer;
    this.client = client;
};


Host.fromPeer = function(peer, name) {
    var client = new Client();
    var host = new Host(name, peer, client);

    peer.on('connection', function(conn) {
        host.join(conn);
    });
    return host;
};

Host.prototype.handle = function(conn, data) {
    console.log('Handling:', data);
    this.sendAll(data, conn);
};

Host.prototype.getMembers = function() {
    var members = [{
        name: this.name
    }]
    for (var c in this.peer.connections) {
        var conn = this.peer.connections[c][0];
        members.push({
            name: conn.metadata.name
        });
    }

    return members;
};

Host.prototype.sendAll = function(data, except) {
    var ok = this.client.handle(data);
    if (!ok) return;

    for (var c in this.peer.connections) {
        this.peer.connections[c].map(function(conn) {
            if (conn == except) return;
            conn.send(data);
        });
    }
};

Host.prototype.join = function(conn) {
    var name = conn.metadata.name;

    this.sendAll(['msg', null, 'Joined: ' + name]);
    this.sendAll(['members', this.getMembers()]);

    conn.on('close', this.leave.bind(this, conn));
    conn.on('data', this.handle.bind(this, conn));
};

Host.prototype.leave = function(conn) {
    var name = conn.metadata.name;

    this.sendAll(['msg', null, 'Left: ' + name]);
    this.sendAll(['members', this.getMembers()]);
};
