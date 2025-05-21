export {};

import { BigNumber } from "bignumber.js";
try {
  let res = await fetch(
    "https://api.cartridge.gg/x/ponziland-tourney/torii/sql",
    {
      method: "POST",
      body: `
      SELECT account_address, balance, symbol
      FROM token_balances bal
      LEFT JOIN tokens t ON t.id = bal.token_id
      WHERE t.symbol = "eLORDS"
      ORDER BY balance DESC
      LIMIT 30;
    `,
    },
  );

  let data = await res.json();

  let entries: any[] = [];
  for (const element of data) {
    let address = `https://socialink.ponzi.land/api/user/${element.account_address}`;
    let res2 = await fetch(address);
    let data2 = await res2.json();

    let entry = {
      ...element,
      username: data2?.username,
      discord: data2?.providers?.find((a: any) => a.service == "discord")
        ?.username,
      amount: new BigNumber(element.balance).shiftedBy(-18),
    };
    if (entry.discord != undefined && entry.discord != "knownasred") {
      entries.push(entry);
    }
  }

  // Get only the first 20 entries
  entries = entries.slice(0, 20);
  let totalSupply = entries.reduce(
    (acc, entry) => acc.plus(entry.amount),
    new BigNumber(0),
  );

  let totalSupplyFormatted = totalSupply.toFixed(8);

  let index = 0;
  let validator = new BigNumber(0);
  for (const entry of entries) {
    const percentage = entry.amount.dividedBy(totalSupply).times(100);
    validator = validator.plus(percentage);
    console.log(
      `${index + 1}. ${entry.username} (${entry.discord})
      - ${entry.amount.toFixed(8)} eLORDS, ${percentage.toFixed(6)}% of total supply`,
    );
    index++;
  }

  console.log("Sum of all percentages: ", validator.toFixed(6));
} catch (e) {
  console.error("Got e!", e);
}
