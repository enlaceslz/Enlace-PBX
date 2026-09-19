import { UserAgent, UserAgentOptions, Registerer, Inviter, SessionState, Session } from 'sip.js';

export type WebRTCConnectionState =
  | 'IDLE'
  | 'CONNECTING_WSS'
  | 'WSS_DISCONNECTED'
  | 'REGISTERING'
  | 'REGISTERED'
  | 'SIP_REGISTRATION_FAILED'
  | 'WEBRTC_UNAVAILABLE'
  | 'CALLING'
  | 'RINGING'
  | 'CONNECTED'
  | 'DISCONNECTED'
  | 'CALL_REJECTED';

export interface SipWebRTCConfig {
  extension: string;
  secret: string;
  domain: string;
  wssUrl: string;
}

export interface CallStatusEvent {
  state: WebRTCConnectionState;
  reason?: string;
  sipCode?: number;
  duration?: number;
}

export class SipWebRTCClient {
  private userAgent: UserAgent | null = null;
  private registerer: Registerer | null = null;
  private currentSession: Session | null = null;
  private remoteAudioElement: HTMLAudioElement | null = null;
  private connectionState: WebRTCConnectionState = 'IDLE';
  private onStateChangeCallback?: (event: CallStatusEvent) => void;
  private config: SipWebRTCConfig | null = null;

  constructor(onStateChange?: (event: CallStatusEvent) => void) {
    this.onStateChangeCallback = onStateChange;
    this.initAudioElement();
  }

  private initAudioElement() {
    if (typeof document !== 'undefined') {
      let el = document.getElementById('enlace-webrtc-remote-audio') as HTMLAudioElement;
      if (!el) {
        el = document.createElement('audio');
        el.id = 'enlace-webrtc-remote-audio';
        el.autoplay = true;
        document.body.appendChild(el);
      }
      this.remoteAudioElement = el;
    }
  }

  private setState(state: WebRTCConnectionState, reason?: string, sipCode?: number) {
    this.connectionState = state;
    if (this.onStateChangeCallback) {
      this.onStateChangeCallback({ state, reason, sipCode });
    }
  }

  public getState(): WebRTCConnectionState {
    return this.connectionState;
  }

  /**
   * Conecta ao Asterisk WSS e registra o ramal SIP PJSIP
   */
  public async connectAndRegister(config: SipWebRTCConfig): Promise<void> {
    this.config = config;

    // Verifica suporte básico ao WebRTC
    if (typeof navigator === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      this.setState('WEBRTC_UNAVAILABLE', 'Navegador sem suporte à API WebRTC getUserMedia');
      return;
    }

    try {
      this.setState('CONNECTING_WSS', `Conectando WebSocket seguro em ${config.wssUrl}...`);

      const uri = UserAgent.makeURI(`sip:${config.extension}@${config.domain}`);
      if (!uri) {
        this.setState('SIP_REGISTRATION_FAILED', 'URI SIP inválida');
        return;
      }

      const userAgentOptions: UserAgentOptions = {
        uri,
        transportOptions: {
          server: config.wssUrl,
          connectionTimeout: 6,
        },
        authorizationUsername: config.extension,
        authorizationPassword: config.secret,
        displayName: `Ramal ${config.extension}`,
        userAgentString: 'Enlace-PBX Webphone WebRTC 20.17',
      };

      this.userAgent = new UserAgent(userAgentOptions);

      // Tratamento de queda de conexão WSS
      this.userAgent.transport.onConnect = () => {
        this.setState('REGISTERING', 'WSS conectado. Enviando REGISTER SIP ao Asterisk...');
        this.register();
      };

      this.userAgent.transport.onDisconnect = (error) => {
        const msg = error ? error.message : 'Conexão WebSocket WSS com o Asterisk encerrada ou indisponível.';
        this.setState('WSS_DISCONNECTED', msg);
      };

      await this.userAgent.start();
    } catch (err: any) {
      this.setState(
        'WSS_DISCONNECTED',
        `Falha ao conectar no WSS Asterisk (${config.wssUrl}): ${err.message || 'Serviço offline'}`
      );
    }
  }

  private register() {
    if (!this.userAgent) return;

    this.registerer = new Registerer(this.userAgent, {
      expires: 300,
    });

    this.registerer.stateChange.addListener((newState) => {
      switch (newState) {
        case 'Registered':
          this.setState('REGISTERED', 'Ramal registrado no Asterisk res_pjsip.');
          break;
        case 'Unregistered':
          this.setState('IDLE', 'Ramal não registrado.');
          break;
        case 'Terminated':
          this.setState('SIP_REGISTRATION_FAILED', 'Registro PJSIP finalizado ou rejeitado.');
          break;
      }
    });

    this.registerer.register().catch((err) => {
      this.setState('SIP_REGISTRATION_FAILED', `Falha de autenticação SIP: ${err.message}`);
    });
  }

  /**
   * Disca para um destino enviando um INVITE SIP real
   */
  public async call(targetNumber: string, isVideo: boolean = false): Promise<void> {
    if (!this.userAgent) {
      this.setState('WSS_DISCONNECTED', 'Asterisk WSS offline. Impossível enviar INVITE.');
      return;
    }

    if (!this.config) return;

    const targetUri = UserAgent.makeURI(`sip:${targetNumber.trim()}@${this.config.domain}`);
    if (!targetUri) {
      this.setState('CALL_REJECTED', 'Número de destino inválido no plano de discagem.', 400);
      return;
    }

    try {
      this.setState('CALLING', `Enviando INVITE para ${targetNumber}...`);

      const inviter = new Inviter(this.userAgent, targetUri, {
        sessionDescriptionHandlerOptions: {
          constraints: {
            audio: true,
            video: isVideo,
          },
        },
      });

      this.currentSession = inviter;

      inviter.stateChange.addListener((state) => {
        switch (state) {
          case SessionState.Establishing:
            this.setState('RINGING', 'Chamando (180 Ringing)...');
            break;
          case SessionState.Established:
            this.setState('CONNECTED', 'Chamada atendida (200 OK). Áudio bidirecional ativo.');
            this.setupRemoteMedia(inviter);
            break;
          case SessionState.Terminated:
            this.setState('DISCONNECTED', 'Chamada encerrada.');
            this.currentSession = null;
            break;
        }
      });

      await inviter.invite({
        requestDelegate: {
          onReject: (response) => {
            const code = response.message.statusCode;
            const phrase = response.message.reasonPhrase || 'Rejeitada pelo Asterisk';
            this.setState('CALL_REJECTED', `SIP ${code}: ${phrase}`, code);
          },
        },
      });
    } catch (err: any) {
      this.setState('CALL_REJECTED', `Erro ao iniciar chamada: ${err.message}`);
    }
  }

  private setupRemoteMedia(session: Session) {
    const sdh = session.sessionDescriptionHandler as any;
    if (sdh && sdh.peerConnection) {
      const pc: RTCPeerConnection = sdh.peerConnection;
      pc.ontrack = (event) => {
        if (this.remoteAudioElement && event.streams && event.streams[0]) {
          this.remoteAudioElement.srcObject = event.streams[0];
          this.remoteAudioElement.play().catch((e) => console.warn('Audio play error:', e));
        }
      };
    }
  }

  /**
   * Encerra a chamada ativa com BYE ou CANCEL
   */
  public async hangup(): Promise<void> {
    if (!this.currentSession) return;

    try {
      switch (this.currentSession.state) {
        case SessionState.Initial:
        case SessionState.Establishing:
          if (this.currentSession instanceof Inviter) {
            await this.currentSession.cancel();
          }
          break;
        case SessionState.Established:
          await this.currentSession.bye();
          break;
      }
    } catch (err) {
      console.warn('Erro ao desligar chamada SIP:', err);
    } finally {
      this.currentSession = null;
      this.setState('IDLE', 'Chamada encerrada.');
    }
  }

  /**
   * Envia dígito DTMF RFC 4733
   */
  public sendDtmf(tone: string): void {
    if (!this.currentSession || this.currentSession.state !== SessionState.Established) return;
    try {
      (this.currentSession as any).dtmf(tone);
    } catch (err) {
      console.warn('Erro ao enviar DTMF:', err);
    }
  }

  /**
   * Ativa / Desativa Mute do microfone
   */
  public setMute(mute: boolean): void {
    if (!this.currentSession) return;
    const sdh = this.currentSession.sessionDescriptionHandler as any;
    if (sdh && sdh.peerConnection) {
      const pc: RTCPeerConnection = sdh.peerConnection;
      pc.getSenders().forEach((sender) => {
        if (sender.track && sender.track.kind === 'audio') {
          sender.track.enabled = !mute;
        }
      });
    }
  }

  /**
   * Coloca chamada em espera (Hold) enviando re-INVITE com sendonly/inactive
   */
  public async setHold(hold: boolean): Promise<void> {
    if (!this.currentSession || this.currentSession.state !== SessionState.Established) return;
    try {
      const options = {
        sessionDescriptionHandlerOptions: {
          constraints: {
            audio: true,
            video: false,
          },
        },
      };
      if (hold) {
        (this.currentSession as any).invite(options);
      }
    } catch (err) {
      console.warn('Erro ao colocar em espera:', err);
    }
  }

  /**
   * Desconecta o UserAgent e desregistra
   */
  public async disconnect(): Promise<void> {
    if (this.registerer) {
      try {
        await this.registerer.unregister();
      } catch {}
    }
    if (this.userAgent) {
      try {
        await this.userAgent.stop();
      } catch {}
    }
    this.userAgent = null;
    this.registerer = null;
    this.currentSession = null;
    this.setState('IDLE', 'Desconectado do Asterisk.');
  }
}
