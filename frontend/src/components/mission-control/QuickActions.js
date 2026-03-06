import { useState } from "react";
import { Plus, FileText, CheckSquare, Megaphone, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

function QuickActions() {
  const [isOpen, setIsOpen] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const actions = [
    {
      id: 'log-note',
      label: 'Log Note',
      icon: FileText,
      color: 'bg-blue-500 hover:bg-blue-600',
    },
    {
      id: 'create-task',
      label: 'Create Task',
      icon: CheckSquare,
      color: 'bg-green-500 hover:bg-green-600',
    },
    {
      id: 'start-recommendation',
      label: 'Start Recommendation',
      icon: Megaphone,
      color: 'bg-purple-500 hover:bg-purple-600',
    },
  ];

  const handleActionClick = (actionId) => {
    setShowMenu(false);
    setIsOpen(true);
  };

  return (
    <>
      {/* FAB */}
      <div className="fixed bottom-6 right-6 z-40" data-testid="quick-actions-fab">
        {showMenu && (
          <div className="absolute bottom-16 right-0 space-y-2 mb-2">
            {actions.map((action) => {
              const Icon = action.icon;
              return (
                <button
                  key={action.id}
                  data-testid={`quick-action-${action.id}`}
                  onClick={() => handleActionClick(action.id)}
                  className={`
                    flex items-center space-x-3 px-4 py-3 rounded-full shadow-lg
                    ${action.color} text-white font-medium text-sm
                    transform transition-all duration-200 hover:scale-105
                    animate-in slide-in-from-bottom-2
                  `}
                >
                  <Icon className="w-5 h-5" />
                  <span>{action.label}</span>
                </button>
              );
            })}
          </div>
        )}

        <button
          onClick={() => setShowMenu(!showMenu)}
          className={`
            w-14 h-14 rounded-full bg-primary hover:bg-primary/90 text-white
            shadow-lg hover:shadow-xl transform transition-all duration-200
            flex items-center justify-center
            ${showMenu ? 'rotate-45' : ''}
          `}
          data-testid="fab-button"
        >
          {showMenu ? <X className="w-6 h-6" /> : <Plus className="w-6 h-6" />}
        </button>
      </div>

      {/* Quick Action Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md" data-testid="quick-action-dialog">
          <DialogHeader>
            <DialogTitle style={{fontFamily: 'Manrope'}}>Quick Action</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-gray-600">
              Quick action functionality will be implemented in V1.5.
            </p>
            <Button 
              className="w-full mt-4 bg-primary hover:bg-primary/90 rounded-full"
              onClick={() => setIsOpen(false)}
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default QuickActions;
