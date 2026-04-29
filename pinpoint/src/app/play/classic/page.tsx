import Game from "@/components/Game";
import AuthGate from "@/components/AuthGate";

export default function ClassicGame() {
  return (
    <AuthGate>
      <Game mode="classic" />
    </AuthGate>
  );
}
