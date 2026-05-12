'use client';

import { useConversation } from '../store/conversation.context';
import { useAudioCapture } from '../hooks/useAudioCapture';
import { MicButton } from './MicButton';
import { StateIndicator } from './StateIndicator';
import { AudioWaveform } from './AudioWaveform';

interface ControlPanelProps {
  /** Override from parent when mic permission is known at page level */
  hasPermissionOverride?: boolean;
  /** Called when user taps the interrupt button (passed down to MicButton via wsService) */
  onInterrupt?: () => void;
}

export function ControlPanel({ hasPermissionOverride, onInterrupt }: ControlPanelProps = {}) {
  const { state } = useConversation();
  const { hasPermission, permissionDenied, startCapture, stopCapture } = useAudioCapture(state.appState);

  // Prefer parent-supplied value (computed at page level) over local
  const effectivePermission = hasPermissionOverride ?? (!permissionDenied && hasPermission);

  return (
    <div className="w-full flex-shrink-0">

      {/* ── Main control bar ── */}
      <div
        className="
          h-[100px] w-full
          bg-gray-900 border-t border-gray-800
          flex items-center justify-center gap-8 px-6
        "
      >
        {/* Left: Waveform (user mic) */}
        <div className="hidden sm:flex flex-col items-center gap-1 w-20">
          <AudioWaveform
            isActive={state.appState === 'LISTENING' && state.isMicActive}
            color="blue"
          />
          <span className="text-xs text-gray-600">You</span>
        </div>

        {/* Center: Mic button + state */}
        <div className="flex flex-col items-center gap-2">
          <MicButton
            appState={state.appState}
            hasPermission={effectivePermission}
            onStart={startCapture}
            onStop={stopCapture}
          />
          <StateIndicator appState={state.appState} />
        </div>

        {/* Right: Waveform (AI speaker) */}
        <div className="hidden sm:flex flex-col items-center gap-1 w-20">
          <AudioWaveform
            isActive={state.isAISpeaking}
            color="green"
          />
          <span className="text-xs text-gray-600">AI</span>
        </div>
      </div>
    </div>
  );
}
