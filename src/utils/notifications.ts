/**
 * Solicita permissão para notificações do navegador.
 * @returns Promise<NotificationPermission>
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!("Notification" in window)) {
    console.warn("Este navegador não suporta notificações de desktop.");
    return "denied";
  }
  
  if (Notification.permission === "granted") {
    return "granted";
  }

  try {
    const permission = await Notification.requestPermission();
    return permission;
  } catch (error) {
    console.error("Erro ao solicitar permissão de notificação:", error);
    return "denied";
  }
}

/**
 * Exibe uma notificação nativa do navegador.
 * @param title Título da notificação.
 * @param body Corpo da mensagem.
 */
export function showNativeNotification(title: string, body: string) {
  if (Notification.permission === "granted") {
    new Notification(title, {
      body: body,
      icon: "/favicon.ico", // Usando o favicon como ícone
      vibrate: [200, 100, 200],
    });
    
    // Opcional: Tocar um som leve (requer um arquivo de áudio, mas vamos simular o alerta)
    // Se você tiver um arquivo de som, pode usar: new Audio('/alert.mp3').play();
  }
}