# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
from genlayer import *

class TreasureGuardian(gl.Contract):
    has_treasure: bool

    def __init__(self):
        self.has_treasure = True

    @gl.public.write
    def ask_for_treasure(self, phrase: str) -> None:
        if not self.has_treasure:
            raise gl.vm.UserError("The treasure has already been taken!")

        prompt = f"""
        You are the wise and stern guardian of an ancient treasure.
        An adventurer tries to convince you to give them the treasure by saying: "{phrase}"
        You are very hard to convince. You may only decide to yield the treasure if the phrase is extremely logical, very witty, or shows true courage.
        Respond in pure JSON format: {{"give_treasure": true/false}}
        """

        def leader_fn():
            # The leader executes the prompt to ask the AI
            return gl.nondet.exec_prompt(prompt, response_format="json")

        def validator_fn(leaders_res: gl.vm.Result) -> bool:
            # Validators verify the result is not an error
            if not isinstance(leaders_res, gl.vm.Return):
                return False
            
            # Validators re-evaluate the prompt on their own
            my_result = leader_fn()
            
            # The output is compared: strict Equivalence Principle
            return my_result["give_treasure"] == leaders_res.calldata["give_treasure"]

        # Run the consensus procedure (Optimistic Democracy)
        result = gl.vm.run_nondet_unsafe(leader_fn, validator_fn)
        
        # If there is consensus to give the treasure, update the state
        if result["give_treasure"]:
            self.has_treasure = False

    @gl.public.view
    def check_treasure(self) -> bool:
        return self.has_treasure
