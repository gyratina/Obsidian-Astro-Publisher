# Obsidian-Astro Publisher

Script realizzato con Gemini 3.0/3.1 Pro attraverso dei prompt estremamente precisi e dettagliati, in quanto ho pensato accuratamente il modo in cui volessi poter selezionare i file da poter pubblicare sul mio sito web Astro con Obsidian attraverso la sua Palette dei comandi e QuickAdd.

Ho deciso di farlo con Gemini in quanto al momento non ho intenzione di imparare JavaScript almeno per il momento, e necessito in tempi quanto meno rapidi di un sito web personale e di uno script per Obsidian per pubblicare facilmente le mie Note e Corsi.

---

## Info & Usabilità:

Nell'esecuzione con QuickAdd in Obsidian è privo di errori e funziona esattamente come ho previsto.

Questo script non è solo per Astro, in realtà di fatto non fa altro che offrire attraverso la Palette di Obsidian diverse opzioni di Selezione dei file MarkDown nella cartella del file su cui si è attivi.
Una volta selezionati i file che si desiderano pubblicare, essi vengono copiati nel percorso definito in cima al codice insieme a tutte le immagini presenti nei file Markdown con questa struttura:

<img width="541" height="290" alt="immagine" src="https://github.com/user-attachments/assets/c4aeabce-f75f-4d06-8a14-9586377ccb70" />

#### MoC (Map of Contents) NECESSARIA!

Nel caso in cui si voglia pubblicare un corso, è necessario avere una cartella chiamata MOCs che sia sorella di quella in cui sono presenti le note Markdown che si vogliono pubblicare.
Questo perché nel mio sito uso il MoC di quei file come indice del corso pubblicato.

Ovviamente se si decide di pubblicare solo il file corrente all'inizio del comando con QuickAdd, il MoC non è necessario.

---

## Futuro dello Script

Nonostante per il momento il codice io l'abbia fatto con Gemini, comunque avendone fatto il design riesco a comprenderlo perfettamente.
Tant'è che intendo in futuro modificare la struttura del codice **personalmente** per permetterne una più facile personalizzazione.
Quando mi metterò al lavoro per farlo, pubblicherò su questo README anche una facile guida all'uso e alla personalizzazione.
