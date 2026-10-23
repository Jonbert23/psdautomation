import { useEffect } from "react";

import App1 from "@/components/ui/app-1";

export default function App1Demo() {
  useEffect(() => {
    document.documentElement.classList.add("app1");
    return () => {
      document.documentElement.classList.remove("app1");
    };
  }, []);

  return (
    <div className="h-screen w-full overflow-auto">
      <App1 />
    </div>
  );
}
