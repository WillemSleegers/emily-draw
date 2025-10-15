"use client"

interface ColorPickerProps {
  selectedColor: string
  onColorChange: (color: string) => void
}

const COLORS = [
  // Reds (light to dark)
  { name: "Light Pink", value: "#FFB6C1" },
  { name: "Pink", value: "#FF4081" },
  { name: "Rose", value: "#FF69B4" },
  { name: "Hot Pink", value: "#FF1493" },
  { name: "Red", value: "#FF0000" },
  { name: "Dark Red", value: "#C62828" },

  // Oranges (light to dark)
  { name: "Peach", value: "#FFDAB9" },
  { name: "Light Orange", value: "#FFB347" },
  { name: "Coral", value: "#FF7F50" },
  { name: "Orange", value: "#FF8C00" },
  { name: "Dark Orange", value: "#FF6347" },

  // Yellows (light to dark)
  { name: "Cream", value: "#FFFACD" },
  { name: "Lemon", value: "#FFF44F" },
  { name: "Light Yellow", value: "#FFEB3B" },
  { name: "Yellow", value: "#FFD700" },
  { name: "Gold", value: "#DAA520" },

  // Greens (light to dark)
  { name: "Mint", value: "#98FF98" },
  { name: "Light Green", value: "#90EE90" },
  { name: "Lime", value: "#32CD32" },
  { name: "Green", value: "#00C853" },
  { name: "Forest", value: "#228B22" },
  { name: "Dark Green", value: "#2E7D32" },

  // Blues (light to dark)
  { name: "Light Blue", value: "#87CEEB" },
  { name: "Sky Blue", value: "#87CEFA" },
  { name: "Blue", value: "#2196F3" },
  { name: "Teal", value: "#008080" },
  { name: "Dark Blue", value: "#1565C0" },
  { name: "Navy", value: "#000080" },

  // Purples (light to dark)
  { name: "Lavender", value: "#E6E6FA" },
  { name: "Light Purple", value: "#E1BEE7" },
  { name: "Violet", value: "#EE82EE" },
  { name: "Purple", value: "#9C27B0" },
  { name: "Dark Purple", value: "#6A1B9A" },

  // Browns (light to dark)
  { name: "Beige", value: "#F5F5DC" },
  { name: "Tan", value: "#D2B48C" },
  { name: "Light Brown", value: "#A1887F" },
  { name: "Brown", value: "#795548" },
  { name: "Dark Brown", value: "#5D4037" },

  // Neutrals (light to dark)
  { name: "White", value: "#FFFFFF" },
  { name: "Light Gray", value: "#E0E0E0" },
  { name: "Gray", value: "#9E9E9E" },
  { name: "Dark Gray", value: "#616161" },
  { name: "Black", value: "#000000" },
]

export default function ColorPicker({
  selectedColor,
  onColorChange,
}: ColorPickerProps) {
  return (
    <div className="h-full overflow-y-auto overflow-x-hidden py-4 px-3 bg-white dark:bg-gray-800 rounded-2xl border-4 border-gray-300 dark:border-gray-700 ">
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
                    ? "w-16 h-16 ring-4 ring-offset-4  scale-110"
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
