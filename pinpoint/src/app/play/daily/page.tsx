import Game from "@/components/Game";
import AuthGate from "@/components/AuthGate";

export default function DailyGame() {
  return (
    <AuthGate>
      <Game mode="daily" />
    </AuthGate>
  );
}
