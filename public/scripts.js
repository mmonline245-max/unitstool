(async function(){
  const tools = await fetch('/content/tools.json').then(r=>r.json());
  tools.forEach(t=>t.slug = t.slug || t.name.toLowerCase().replace(/\s+/g,'-'));

  const s = document.getElementById('search');
  if (s) {
    s.addEventListener('input', (e)=>{
      const q = e.target.value.toLowerCase();
      const cards = document.querySelectorAll('.tool-card');
      cards.forEach(c=>{ if (c.textContent.toLowerCase().includes(q)) c.style.display='block'; else c.style.display='none'; });
    });
  }

  const app = document.getElementById('tool-app');
  if (app) {
    const id = app.dataset.tool;
    const tool = tools.find(t=>t.id==id) || tools[0];
    function inputRow(label, id){ return `<div class="row"><label>${label}</label><input id="${id}" /></div>` }
    let html = '';
    if (tool.type==='bmi'){
      html += inputRow('Weight (kg)', 'w');
      html += inputRow('Height (cm)', 'h');
      html += '<button id="calc">Calculate BMI</button><div id="out"></div>';
    } else if (tool.type==='age'){
      html += inputRow('Date of birth', 'dob');
      html += '<button id="calc">Calculate Age</button><div id="out"></div>';
    } else if (tool.type==='loan'){
      html += inputRow('Loan amount', 'amount');
      html += inputRow('Annual interest %', 'rate');
      html += inputRow('Years', 'years');
      html += '<button id="calc">Calculate</button><div id="out"></div>';
    } else {
      html = '<p>This tool uses a generic numeric calculator. Enter values below and press Calculate.</p>' + inputRow('Value A','a') + inputRow('Value B','b') + '<button id="calc">Calculate</button><div id="out"></div>';
    }
    app.innerHTML = html;
    document.getElementById('calc').addEventListener('click', ()=>{
      const out = document.getElementById('out');
      try{
        if (tool.type==='bmi'){
          const w = parseFloat(document.getElementById('w').value);
          const h = parseFloat(document.getElementById('h').value)/100;
          const bmi = (w / (h*h)).toFixed(2);
          out.innerHTML = `<strong>BMI: ${bmi}</strong>`;
        } else if (tool.type==='age'){
          const d = new Date(document.getElementById('dob').value);
          const age = Math.floor((Date.now()-d.getTime())/(365.25*24*3600*1000));
          out.innerHTML = `<strong>Age: ${age} years</strong>`;
        } else if (tool.type==='loan'){
          const P = parseFloat(document.getElementById('amount').value);
          const r = parseFloat(document.getElementById('rate').value)/100/12;
          const n = parseFloat(document.getElementById('years').value)*12;
          const M = (P*r)/(1-Math.pow(1+r,-n));
          out.innerHTML = `<strong>Monthly payment: ${M.toFixed(2)}</strong>`;
        } else {
          const a = parseFloat(document.getElementById('a').value);
          const b = parseFloat(document.getElementById('b').value);
          out.innerHTML = `<strong>Result: ${ (a + b) }</strong>`;
        }
      }catch(e){ out.innerText = 'Error: ' + e.message }
    });
  }
})();