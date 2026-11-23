export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // 1. Rota que o site (Admin) chama para enviar comando
    if (url.pathname === "/send-comando" && request.method === "POST") {
      try {
        const dados = await request.json();
        const id = env.TAG_ROOM.idFromName("sala_principal");
        const stub = env.TAG_ROOM.get(id);
        
        return stub.fetch(new Request("https://dummy/send-comando", {
          method: "POST",
          body: JSON.stringify(dados)
        }));
      } catch (e) {
        return new Response("Erro no envio", { status: 500 });
      }
    }

    // 2. Rota para os scripts Lua conectarem (WebSocket)
    const upgradeHeader = request.headers.get("Upgrade");
    if (upgradeHeader === "websocket") {
      const id = env.TAG_ROOM.idFromName("sala_principal");
      const stub = env.TAG_ROOM.get(id);
      return stub.fetch(request);
    }

    return new Response("Not found", { status: 404 });
  }
};

export class TagRoom {
  constructor(state, env) {
    this.state = state;
    this.sessions = [];
  }

  async fetch(request) {
    const url = new URL(request.url);

    if (url.pathname === "/send-comando") {
      const dados = await request.json();
      const mensagem = JSON.stringify({
        type: "command",
        alvo: dados.alvo,
        comando: dados.comando,
        texto: dados.texto,
        autor: dados.autor || "SAGAZx"
      });

      for (const s of this.sessions) {
        try { s.send(mensagem); } catch (e) {}
      }
      return new Response("Comando enviado", { status: 200 });
    }

    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    this.handleSession(server);
    return new Response(null, { status: 101, webSocket: client });
  }

  async handleSession(websocket) {
    websocket.accept();
    this.sessions.push(websocket);

    websocket.addEventListener("message", (msg) => {
      try {
        const data = JSON.parse(msg.data);
        
        if (data.type === "register") {
          websocket.userId = data.userId;
          websocket.nome = data.nome;
          websocket.jobId = data.jobId;
          websocket.placeId = data.placeId;
          websocket.nomeJogo = data.nomeJogo;

          websocket.send(JSON.stringify({ type: "ping", mensagem: "Conectado na Sala!" }));
          this.broadcast();
        }
      } catch (e) {}
    });

    websocket.addEventListener("close", () => {
      this.sessions = this.sessions.filter(s => s !== websocket);
      this.broadcast();
    });
  }

  broadcast() {
    const players = [];
    for (const s of this.sessions) {
      if (s.userId) {
        players.push({
          userId: s.userId,
          nome: s.nome,
          jobId: s.jobId,
          placeId: s.placeId,
          nomeJogo: s.nomeJogo
        });
      }
    }

    for (const s of this.sessions) {
      try { s.send(JSON.stringify({ type: "online_list", players: players })); } catch (e) {}
    }
  }
}