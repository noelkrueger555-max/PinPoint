import Game from "@/components/Game";
import AuthGate from "@/components/AuthGate";

export default function NoMoveGame() {
  return (
    <AuthGate>
      <Game mode="no-move" />
    </AuthGate>
  );
}
