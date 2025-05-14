// frontend/src/Impressum.jsx
//import QuizLayout from './QuizLayout'; // Stelle sicher, dass der Pfad zu QuizLayout korrekt ist

export default function Impressum() {
    return (
        //<QuizLayout> {/* Dies sorgt dafür, dass dein Standard-Layout mit Header verwendet wird */}
        <div className="prose prose-sm sm:prose-base prose-invert mx-auto p-4 md:p-8 bg-gray-800 rounded-lg shadow-xl max-w-2xl my-8">
        <h1>Impressum</h1>

        <h2>Angaben gemäß § 5 TMG:</h2>
        <p>
        <strong>Philipp Noppenberger</strong> <br />
        Gambrinusstr. 5 <br />
        01159 Dresden <br />
        Deutschland
        </p>

        <h2>Kontakt:</h2>
        <p>
        E-Mail: <strong>philipp.noppenberger@gmail.com</strong>
        {/* Wenn du eine Telefonnummer angeben möchtest: */}
        {/* <br />Telefon: DEINE TELEFONNUMMER (optional) */}
        </p>

        <h2>Verantwortlich für den Inhalt nach § 55 Abs. 2 RStV:</h2>
        <p>
        <strong>Philipp Noppenberger</strong> <br />
        Gambrinusstr. 5 <br />
        01159 Dresden
        </p>

        <h3 className="mt-6 border-t border-gray-700 pt-4">Haftungsausschluss (Disclaimer)</h3>
        <h4>Haftung für Inhalte</h4>
        <p>
        Als Diensteanbieter sind wir gemäß § 7 Abs.1 TMG für eigene Inhalte auf diesen Seiten nach den allgemeinen Gesetzen verantwortlich. Nach §§ 8 bis 10 TMG sind wir als Diensteanbieter jedoch nicht verpflichtet, übermittelte oder gespeicherte fremde Informationen zu überwachen oder nach Umständen zu forschen, die auf eine rechtswidrige Tätigkeit hinweisen. Verpflichtungen zur Entfernung oder Sperrung der Nutzung von Informationen nach den allgemeinen Gesetzen bleiben hiervon unberührt. Eine diesbezügliche Haftung ist jedoch erst ab dem Zeitpunkt der Kenntnis einer konkreten Rechtsverletzung möglich. Bei Bekanntwerden von entsprechenden Rechtsverletzungen werden wir diese Inhalte umgehend entfernen.
        </p>
        <h4>Haftung für Links</h4>
        <p>
        Unser Angebot enthält Links zu externen Websites Dritter, auf deren Inhalte wir keinen Einfluss haben. Deshalb können wir für diese fremden Inhalte auch keine Gewähr übernehmen. Für die Inhalte der verlinkten Seiten ist stets der jeweilige Anbieter oder Betreiber der Seiten verantwortlich. Die verlinkten Seiten wurden zum Zeitpunkt der Verlinkung auf mögliche Rechtsverstöße überprüft. Rechtswidrige Inhalte waren zum Zeitpunkt der Verlinkung nicht erkennbar. Eine permanente inhaltliche Kontrolle der verlinkten Seiten ist jedoch ohne konkrete Anhaltspunkte einer Rechtsverletzung nicht zumutbar. Bei Bekanntwerden von Rechtsverletzungen werden wir derartige Links umgehend entfernen.
        </p>
        <h4>Urheberrecht</h4>
        <p>
        Die durch die Seitenbetreiber erstellten Inhalte und Werke auf diesen Seiten unterliegen dem deutschen Urheberrecht. Die Vervielfältigung, Bearbeitung, Verbreitung und jede Art der Verwertung außerhalb der Grenzen des Urheberrechtes bedürfen der schriftlichen Zustimmung des jeweiligen Autors bzw. Erstellers. Downloads und Kopien dieser Seite sind nur für den privaten, nicht kommerziellen Gebrauch gestattet. Soweit die Inhalte auf dieser Seite nicht vom Betreiber erstellt wurden, werden die Urheberrechte Dritter beachtet. Insbesondere werden Inhalte Dritter als solche gekennzeichnet. Sollten Sie trotzdem auf eine Urheberrechtsverletzung aufmerksam werden, bitten wir um einen entsprechenden Hinweis. Bei Bekanntwerden von Rechtsverletzungen werden wir derartige Inhalte umgehend entfernen.
        </p>

        <p className="mt-8 text-xs italic text-gray-500">
        Dieses Impressum wurde unter Zuhilfenahme von öffentlich zugänglichen Vorlagen erstellt und dient als Beispiel. Es stellt keine Rechtsberatung dar.
        </p>
        </div>
        //</QuizLayout>
    );
}
