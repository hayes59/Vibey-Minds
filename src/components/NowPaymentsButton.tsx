/**
 * NOWPayments' hosted "payment button" embed. This links to a single,
 * fixed invoice configured on NOWPayments' dashboard (iid=6433223271) —
 * it does NOT know which vibeyminds user is paying or credit them
 * automatically. Use this for a simple "buy me a coffee"-style flat
 * payment; for the per-user credit packages that auto-credit a balance,
 * use the package picker above (BuyCreditsPanel), which goes through
 * /api/credits/checkout and the webhook so the right account gets
 * credited.
 */
export default function NowPaymentsButton() {
  return (
    <a
      href="https://nowpayments.io/payment/?iid=6433223271&source=button"
      target="_blank"
      rel="noreferrer noopener"
      className="inline-block"
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- third-party badge asset, not a local/optimizable image */}
      <img
        src="https://nowpayments.io/images/embeds/payments-button-white.svg"
        alt="Cryptocurrency & Bitcoin payment button by NOWPayments"
      />
    </a>
  );
}
