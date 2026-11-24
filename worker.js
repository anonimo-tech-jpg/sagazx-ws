export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === "/send-comando" && request.method === "POST") {
      try {
        const dados = await request.json();
        
        const mensagem = JSON.stringify({
          type: "command",
          alvo: dados.alvo,
          comando: dados.comando,
          texto: dados.texto || "",
          cmdId: dados.cmdId || "", // Repassa o ID
          autor: dados.autor || "SAGAZx"
        });

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

    const upgradeHeader = request.headers.get("Upgrade");
    if (upgradeHeader === "websocket") {
      const pair = new WebSocketPair();
      const [client, server] = Object.values(pair);
      server.accept();
      
      if (!globalThis.sessions) globalThis.sessions = new Set();
      globalThis.sessions.add(server);

      server.addEventListener("close", () => {
        globalThis.sessions.delete(server);
      });

      server.send(JSON.stringify({ type: "ping", mensagem: "Conectado!" }));
      return new Response(null, { status: 101, webSocket: client });
    }

    return new Response("Not found", { status: 404 });
  }
};