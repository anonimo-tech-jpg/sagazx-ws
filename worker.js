export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // 1. Rota que o site (Admin) chama para enviar comando
    if (url.pathname === "/send-comando" && request.method === "POST") {
      try {
        const dados = await request.json();
        
        // Cria a mensagem JSON que o script Lua vai ler
        const mensagem = JSON.stringify({
          type: "command",
          alvo: dados.alvo,
          comando: dados.comando,
          texto: dados.texto || "",
          autor: dados.autor || "SAGAZx"
        });

        // Se tiver alguém conectado, repassa a mensagem
        if (globalThis.sessions) {
          for (const s of globalThis.sessions) {
            try { s.send(mensagem); } catch (e) {}
          }
        }

        return new Response("Comando enviado", { status: 200 });
      } catch (e) {
        return new Response("Erro no envio", { status: 500 });
      }
    }

    // 2. Rota para os scripts Lua conectarem (WebSocket)
    const upgradeHeader = request.headers.get("Upgrade");
    if (upgradeHeader === "websocket") {
      const pair = new WebSocketPair();
      const [client, server] = Object.values(pair);
      
      server.accept();
      
      // Inicializa a lista global de sessões se não existir
      if (!globalThis.sessions) globalThis.sessions = new Set();
      globalThis.sessions.add(server);

      server.addEventListener("close", () => {
        globalThis.sessions.delete(server);
      });

      // Manda um "ping" só pra confirmar que conectou
      server.send(JSON.stringify({ type: "ping", mensagem: "Conectado!" }));

      return new Response(null, { status: 101, webSocket: client });
    }

    return new Response("Not found", { status: 404 });
  }
};