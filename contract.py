# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
from genlayer import *

class TreasureGuardian(gl.Contract):
    has_treasure: bool

    def __init__(self):
        self.has_treasure = True

    @gl.public.write
    def chiedi_tesoro(self, phrase: str) -> None:
        if not self.has_treasure:
            raise gl.vm.UserError("Il tesoro è già stato preso!")

        prompt = f"""
        Sei il saggio e severo guardiano di un antico tesoro.
        Un avventuriero cerca di convincerti a lasciargli il tesoro dicendo: "{phrase}"
        Sei molto difficile da convincere. Solo se la frase è estremamente logica, molto simpatica o dimostra vero coraggio, puoi decidere di cedere il tesoro.
        Rispondi in formato JSON puro: {{"give_treasure": true/false}}
        """

        def leader_fn():
            # Il leader esegue il prompt per chiedere all'IA
            return gl.nondet.exec_prompt(prompt, response_format="json")

        def validator_fn(leaders_res: gl.vm.Result) -> bool:
            # I validatori verificano che il risultato non sia un errore
            if not isinstance(leaders_res, gl.vm.Return):
                return False
            
            # I validatori ri-eseguono il prompt per conto loro
            my_result = leader_fn()
            
            # L'output viene confrontato: principio di Equivalenza stretta
            return my_result["give_treasure"] == leaders_res.calldata["give_treasure"]

        # Esegue la procedura di consenso (Optimistic Democracy)
        result = gl.vm.run_nondet_unsafe(leader_fn, validator_fn)
        
        # Se c'è consenso sul fatto di cedere il tesoro, aggiorniamo lo stato
        if result["give_treasure"]:
            self.has_treasure = False

    @gl.public.view
    def controlla_tesoro(self) -> bool:
        return self.has_treasure
