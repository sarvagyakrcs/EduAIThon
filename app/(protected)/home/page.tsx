"use server";
import { auth } from "@/auth";
import React from "react";

const HomePage = async () => {
  const session = await auth();
  return <div>
    <pre>
        {JSON.stringify(session, null, 2)}
    </pre>
  </div>;
};

export default HomePage;
