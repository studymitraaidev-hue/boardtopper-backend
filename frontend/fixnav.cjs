const fs = require('fs');
let c = fs.readFileSync('src/components/layout/Navbar.tsx', 'utf8');
c = c.replace(
  "import { Link, useLocation } from 'react-router-dom';",
  "import { Link, useLocation } from 'react-router-dom';\nimport { useAuth } from '../../context/AuthContext';"
);
c = c.replace(
  "const isLanding = location.pathname === '/';",
  "const isLanding = location.pathname === '/';\n  const { user } = useAuth();"
);
c = c.replace(
  `<Link to="/login">
              <Button variant="ghost" size="sm" className="font-bold text-slate-700">Login</Button>
            </Link>
            <Link to="/signup">
              <Button variant="secondary" size="sm" className="gap-1.5 shadow-lg shadow-blue-100">
                <Sparkles className="w-3.5 h-3.5 text-amber-300 fill-amber-300" />
                Start Free
              </Button>
            </Link>`,
  `{user ? (
              <Link to="/dashboard">
                <Button variant="secondary" size="sm" className="gap-1.5 shadow-lg shadow-blue-100">
                  <Sparkles className="w-3.5 h-3.5 text-amber-300 fill-amber-300" />
                  Dashboard
                </Button>
              </Link>
            ) : (
              <>
                <Link to="/login">
                  <Button variant="ghost" size="sm" className="font-bold text-slate-700">Login</Button>
                </Link>
                <Link to="/signup">
                  <Button variant="secondary" size="sm" className="gap-1.5 shadow-lg shadow-blue-100">
                    <Sparkles className="w-3.5 h-3.5 text-amber-300 fill-amber-300" />
                    Start Free
                  </Button>
                </Link>
              </>
            )}`
);
fs.writeFileSync('src/components/layout/Navbar.tsx', c);
console.log('done');
