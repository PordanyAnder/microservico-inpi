const express = require('express');
const puppeteer = require('puppeteer-core');

const app = express();

app.get('/buscar', async (req, res) => {
  const marca = req.query.marca;
  if (!marca) {
    return res.status(400).json({ erro: "Informe a marca via parâmetro ?marca=" });
  }

  let browser;
  try {
    browser = await puppeteer.launch({
const browser = await puppeteer.launch({
  headless: true,
  executablePath: '/usr/bin/chromium-browser',
  args: ['--no-sandbox', '--disable-setuid-sandbox']
});


    const page = await browser.newPage();
    await page.goto('https://busca.inpi.gov.br/pePI/', { waitUntil: 'networkidle2' });

    const [continuarBtn] = await page.$x("//input[@value='Continuar']");
    if (continuarBtn) {
      await continuarBtn.click();
      await page.waitForTimeout(1000);
    }

    const [marcaLink] = await page.$x("//a[text()='Marca']");
    if (marcaLink) {
      await marcaLink.click();
      await page.waitForTimeout(1000);
    }

    await page.waitForSelector('input[type="text"]');
    const inputs = await page.$$('input[type="text"]');
    await inputs[0].type(marca);
    await page.click('input[type="submit"]');
    await page.waitForNavigation({ waitUntil: 'networkidle2' });

    await page.waitForSelector('table');
    const resultados = await page.$$eval('table tr', rows => {
      return Array.from(rows).slice(1).map(row => {
        const cols = row.querySelectorAll('td');
        return {
          numero: cols[0]?.innerText.trim(),
          nome: cols[2]?.innerText.trim(),
          status: cols[3]?.innerText.trim(),
          titular: cols[4]?.innerText.trim()
        };
      });
    });

    let chance;
    if (resultados.some(r => r.status?.toLowerCase().includes('deferido'))) {
      chance = "Alta chance de indeferimento";
    } else if (resultados.some(r => r.status?.toLowerCase().includes('arquiv'))) {
      chance = "Média chance de aprovação";
    } else if (resultados.length === 0) {
      chance = "Alta chance de aprovação";
    } else {
      chance = "Média chance de aprovação";
    }

    const resumo = resultados.map(r => ({
      marca: r.nome,
      status: r.status
    }));

    const resposta = {
      marca_original: marca,
      quantidade_resultados: resultados.length,
      resumo_resultados: resumo,
      chance_aprovacao: chance
    };

    await browser.close();
    res.json(resposta);
  } catch (erro) {
    if (browser) await browser.close();
    res.status(500).json({ erro: erro.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor iniciado na porta ${PORT}`);
});

