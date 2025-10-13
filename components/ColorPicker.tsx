"use client"

interface ColorPickerProps {
  selectedColor: string
  onColorChange: (color: string) => void
}

const COLORS = [
  // Reds & Pinks
  { name: "Red", value: "#FF0000" },
  { name: "Dark Red", value: "#C62828" },
  { name: "Pink", value: "#FF4081" },
  { name: "Hot Pink", value: "#FF1493" },
  { name: "Light Pink", value: "#FFB6C1" },
  { name: "Rose", value: "#FF69B4" },

  // Oranges
  { name: "Orange", value: "#FF8C00" },
  { name: "Dark Orange", value: "#FF6347" },
  { name: "Light Orange", value: "#FFB347" },
  { name: "Coral", value: "#FF7F50" },
  { name: "Peach", value: "#FFDAB9" },

  // Yellows
  { name: "Yellow", value: "#FFD700" },
  { name: "Light Yellow", value: "#FFEB3B" },
  { name: "Lemon", value: "#FFF44F" },
  { name: "Gold", value: "#FFD700" },
  { name: "Cream", value: "#FFFACD" },

  // Greens
  { name: "Green", value: "#00C853" },
  { name: "Dark Green", value: "#2E7D32" },
  { name: "Light Green", value: "#90EE90" },
  { name: "Lime", value: "#32CD32" },
  { name: "Mint", value: "#98FF98" },
  { name: "Forest", value: "#228B22" },

  // Blues
  { name: "Blue", value: "#2196F3" },
  { name: "Dark Blue", value: "#1565C0" },
  { name: "Light Blue", value: "#87CEEB" },
  { name: "Sky Blue", value: "#87CEFA" },
  { name: "Navy", value: "#000080" },
  { name: "Teal", value: "#008080" },

  // Purples
  { name: "Purple", value: "#9C27B0" },
  { name: "Dark Purple", value: "#6A1B9A" },
  { name: "Light Purple", value: "#E1BEE7" },
  { name: "Lavender", value: "#E6E6FA" },
  { name: "Violet", value: "#EE82EE" },

  // Browns & Neutrals
  { name: "Brown", value: "#795548" },
  { name: "Dark Brown", value: "#5D4037" },
  { name: "Light Brown", value: "#A1887F" },
  { name: "Tan", value: "#D2B48C" },
  { name: "Beige", value: "#F5F5DC" },

  // Grays & Black/White
  { name: "Black", value: "#000000" },
  { name: "Dark Gray", value: "#616161" },
  { name: "Gray", value: "#9E9E9E" },
  { name: "Light Gray", value: "#E0E0E0" },
  { name: "White", value: "#FFFFFF" },
]

export default function ColorPicker({
  selectedColor,
  onColorChange,
}: ColorPickerProps) {
  return (
    <div className="h-full overflow-y-auto overflow-x-hidden py-4 px-3 bg-white dark:bg-gray-800 rounded-2xl border-4 border-gray-300 dark:border-gray-700 shadow-xl">
      <div className="flex flex-col gap-4 items-center">
        {COLORS.map((color) => {
          const isSelected = selectedColor === color.value
          return (
            <button
              key={`${color.name}-${color.value}`}
              onClick={() => onColorChange(color.value)}
              className={`
                relative rounded-full transition-all duration-200 flex-shrink-0
                ${
                  isSelected
                    ? "w-20 h-20 ring-4 ring-offset-4 ring-offset-white dark:ring-offset-gray-800 scale-110"
                    : "w-16 h-16 hover:scale-105"
                }
              `}
              style={{
                backgroundColor: color.value,
                border:
                  color.value === "#FFFFFF" ? "2px solid #E0E0E0" : "none",
              }}
              aria-label={`Select ${color.name}`}
              aria-pressed={isSelected}
            ></button>
          )
        })}
      </div>
    </div>
  )
}
