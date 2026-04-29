import Game from "@/components/Game";
import AuthGate from "@/components/AuthGate";

export default function SpeedrunGame() {
  return (
    <AuthGate>
      <Game mode="speedrun" />
    </AuthGate>
  );
}
