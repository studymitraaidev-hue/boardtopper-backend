const fs = require('fs');
let c = fs.readFileSync('src/pages/Pricing.tsx', 'utf8');
c = c.replace(
  '<Link to={plan.ctaPath}>',
  '<Link to={user ? "/dashboard" : plan.ctaPath}>'
);
fs.writeFileSync('src/pages/Pricing.tsx', c);
console.log('done');
