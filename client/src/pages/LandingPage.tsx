import { Link } from "wouter";

export default function LandingPage() {
  const mainImage = "/images/riya-landing-final.jpg";
  const fallbackImage = "/images/riya-main.jpg";
  
  return (
    <div style={{ 
      width: "100vw", 
      height: "100vh", 
      overflow: "hidden", 
      position: "relative", 
      background: "linear-gradient(135deg, #f5e6d3 0%, #e8d4c9 25%, #d4c3e0 50%, #c9d6e8 75%, #f5e6d3 100%)",
      backgroundSize: "400% 400%",
      animation: "gradientShift 20s ease infinite",
      display: "flex", 
      alignItems: "center", 
      justifyContent: "center" 
    }}>
      {/* Animated background blobs - softer colors matching image */}
      <div style={{
        position: "absolute",
        top: "-10%",
        left: "-10%",
        width: "120%",
        height: "120%",
        background: "radial-gradient(circle at 30% 50%, rgba(168, 85, 247, 0.15) 0%, transparent 60%), radial-gradient(circle at 70% 50%, rgba(236, 72, 153, 0.12) 0%, transparent 60%)",
        filter: "blur(100px)",
        animation: "float 25s ease-in-out infinite",
        zIndex: 0
      }} />

      {/* BACKGROUND IMAGE - Scaled to show full image */}
      <img
        src={mainImage}
        alt="Riya AI"
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          maxWidth: "108%",
          maxHeight: "98vh",
          width: "auto",
          height: "auto",
          objectFit: "contain",
          objectPosition: "center center",
          zIndex: 1,
          display: "block",
          borderRadius: "20px",
          boxShadow: "0 30px 80px rgba(0,0,0,0.3)",
          filter: "drop-shadow(0 20px 40px rgba(152, 16, 250, 0.2))"
        }}
        onLoad={() => console.log("✅ Image loaded successfully!")}
        onError={(e) => {
          console.log("⚠️ Using fallback image...");
          e.currentTarget.src = fallbackImage;
        }}
      />

      {/* Decorative floating elements */}
      <div style={{
        position: "absolute",
        top: "10%",
        left: "10%",
        width: "100px",
        height: "100px",
        background: "rgba(255,255,255,0.1)",
        borderRadius: "50%",
        animation: "float 8s ease-in-out infinite",
        zIndex: 0
      }} />
      <div style={{
        position: "absolute",
        bottom: "15%",
        right: "12%",
        width: "80px",
        height: "80px",
        background: "rgba(255,255,255,0.08)",
        borderRadius: "50%",
        animation: "float 10s ease-in-out infinite reverse",
        zIndex: 0
      }} />

      {/* GET STARTED BUTTON - No animations, static */}
      <Link href="/signup">
        <button
          style={{
            position: "fixed",
            bottom: "calc(8.5% - 33px)",
            left: "50%",
            marginLeft: "-160.5px",
            width: "321px",
            height: "83px",
            background: "linear-gradient(90deg, #9810fa 0%, #f6339a 100%)",
            border: "none",
            cursor: "pointer",
            borderRadius: "40px",
            fontSize: "18px",
            fontWeight: 800,
            color: "#ffffff",
            zIndex: 10,
            boxShadow: "0 8px 24px rgba(152, 16, 250, 0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            letterSpacing: "0.3px",
            textShadow: "0 2px 4px rgba(0,0,0,0.2)",
            opacity: 1,
            transition: "transform 0.2s ease, box-shadow 0.2s ease"
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "scale(1.05)";
            e.currentTarget.style.boxShadow = "0 12px 32px rgba(152, 16, 250, 0.8)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "scale(1)";
            e.currentTarget.style.boxShadow = "0 8px 24px rgba(152, 16, 250, 0.6)";
          }}
          onMouseDown={(e) => {
            e.currentTarget.style.transform = "scale(0.98)";
          }}
          onMouseUp={(e) => {
            e.currentTarget.style.transform = "scale(1.05)";
          }}
          data-testid="button-get-started"
        >
          Let's Get Started
        </button>
      </Link>

    </div>
  );
}
